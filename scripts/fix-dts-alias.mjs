// 修复 vue-tsc --emitDeclarationOnly 产物里的 `@/` 路径别名。
//
// 问题：vue-tsc 在生成 .d.ts 时不会把源码里的 `@/x` 别名改写成相对路径，
// 原样保留 `from "@/types"`。消费端（ERP 是 Vue3 + Vite + TS）没有这个别名，
// 一 import 我们的包就会报 `Cannot find module '@/types'`。
//
// 解决：`@` 在 vite 配置里映射到 `./src`，而 dist 目录结构与 src 一一对应，
// 所以 `@/x` → `dist/x`。本脚本对每个 .d.ts 里的 `@/x` 改写成从「该文件所在目录」
// 到 `dist/x` 的相对路径（去掉扩展名 / 末尾 /index），让消费端 TS 能解析。
//
// 用法（在 npm script 里接在 vue-tsc 之后）：
//   vue-tsc -p tsconfig.lib.json --declaration --emitDeclarationOnly --outDir dist && node scripts/fix-dts-alias.mjs

import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, relative, resolve, sep } from "node:path";

const distDir = resolve(process.cwd(), "dist");

if (!existsSync(distDir)) {
  console.error("[fix-dts-alias] dist/ 不存在，先跑 build:types");
  process.exit(1);
}

// 收集 dist 下所有 .d.ts（不含 .d.ts.map）
function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".d.ts") && !name.endsWith(".d.ts.map")) out.push(p);
  }
  return out;
}

// 把 `@/rest` 解析到 dist 里真实存在的声明文件
function resolveTarget(rest) {
  const candidates = [
    join(distDir, rest + ".d.ts"),
    join(distDir, rest + ".vue.d.ts"),
    join(distDir, rest, "index.d.ts"),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

// `@/rest` -> 相对路径（去扩展名、去末尾 /index）
function toRelativeSpecifier(fromFile, rest) {
  const target = resolveTarget(rest);
  if (!target) {
    return null; // 找不到目标，交给调用方警告
  }
  let rel = relative(dirname(fromFile), target).split(sep).join("/");
  rel = rel.replace(/\.d\.ts$/, ""); // 去 .d.ts
  rel = rel.replace(/\/index$/, ""); // 去 /index（TS 会自己解析）
  if (!rel.startsWith(".")) rel = "./" + rel;
  return rel;
}

const specRe = /@\/([\w./-]+)/g;
let fileCount = 0;
let replaceCount = 0;
const warnings = [];

for (const file of walk(distDir)) {
  const original = readFileSync(file, "utf8");
  if (!original.includes("@/")) continue;
  let changed = false;
  const fixed = original.replace(specRe, (full, rest) => {
    const rel = toRelativeSpecifier(file, rest);
    if (rel === null) {
      warnings.push(`  ${file}: 无法解析 @/${rest}`);
      return full; // 保留原样，由警告暴露
    }
    changed = true;
    replaceCount++;
    return rel;
  });
  if (changed) {
    // 写入时保持 LF，避免 Windows 把 LF 翻转成 CRLF 造成无谓 diff
    writeFileSync(file, fixed.replace(/\r\n/g, "\n"));
    fileCount++;
  }
}

console.log(
  `[fix-dts-alias] 改写 ${replaceCount} 处路径别名，涉及 ${fileCount} 个 .d.ts 文件`
);
if (warnings.length) {
  console.warn("[fix-dts-alias] 警告（未解析的 @/ 别名，需人工核对）：");
  for (const w of warnings) console.warn(w);
}

// 清理：tsconfig.lib.json 已 exclude src/dev，但 vue-tsc 不会清空 outDir，
// 上一轮 emit 残留的 dist/dev 还在。这里删掉，避免 dev 类型桩被打进发布包。
const devDir = join(distDir, "dev");
if (existsSync(devDir)) {
  const { rmSync } = await import("node:fs");
  rmSync(devDir, { recursive: true, force: true });
  console.log("[fix-dts-alias] 已清理 dist/dev（src/dev 已排除，不应进发布包）");
}
