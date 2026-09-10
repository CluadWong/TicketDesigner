#!/usr/bin/env node
/**
 * scripts/merge-package-json.mjs —— 把 release 侧的「发布身份」字段强制写回合并后的 package.json
 *
 * 用法：node scripts/merge-package-json.mjs <目标 package.json> <release 侧备份>
 *
 * 为什么不是直接 `cp 备份 目标`：
 *   promote 早期用整体覆盖防「包名 / 协议回退」，代价是把 dev 的合法改动一起吞掉。
 *   2026-09-10 实测踩中：dev 修了 `exports["./style.css"]` 指向（renderer-core.css →
 *   ticket-designer.css，修宿主丢渲染样式的 bug），promote 时被整体覆盖直接丢弃，
 *   release 上修了个寂寞。
 *
 * 所以改成**只保护与「发布身份」强相关的字段**，其余（exports / dependencies / version /
 * main / types …）一律跟随 dev —— dev 是开发主线，功能改动应该从 dev 流向 release。
 *
 * 被保护的字段（release 侧权威）：
 *   name / private / license / repository / homepage / bugs / publishConfig / files / peerDependencies
 *   —— 这些决定「包叫什么、什么协议、发到哪、对谁公开」，绝不能被 dev 的内部状态改写。
 *   scripts 特殊处理：整体跟随 dev，但 release 侧的 release / promote 脚本必须存在（缺失则补回）。
 */

import fs from "node:fs";

/** 发布身份字段：release 侧权威，无条件覆盖 dev。 */
const AUTHORITATIVE = [
  "name",
  "private",
  "license",
  "repository",
  "homepage",
  "bugs",
  "publishConfig",
  "files",
  "peerDependencies",
];

/** scripts 中必须存在的键（发布流程依赖，dev 裁剪掉也要补回）。 */
const REQUIRED_SCRIPTS = ["release", "promote"];

const [destPath, srcPath] = process.argv.slice(2);
if (!destPath || !srcPath) {
  console.error("用法: node scripts/merge-package-json.mjs <目标 package.json> <release 侧备份>");
  process.exit(2);
}

const dest = JSON.parse(fs.readFileSync(destPath, "utf8"));
const released = JSON.parse(fs.readFileSync(srcPath, "utf8"));

const applied = [];
for (const key of AUTHORITATIVE) {
  // 目标里没有、release 里也没有 → 跳过；release 里没有而目标有 → 保留 dev 的（不误删）。
  if (!(key in released)) continue;
  if (JSON.stringify(dest[key]) === JSON.stringify(released[key])) continue;
  dest[key] = released[key];
  applied.push(key);
}

// scripts：跟随 dev，但补回 release 侧必需的发布脚本。
if (released.scripts) {
  dest.scripts = { ...(dest.scripts ?? {}) };
  for (const key of REQUIRED_SCRIPTS) {
    if (!(key in dest.scripts) && key in released.scripts) {
      dest.scripts[key] = released.scripts[key];
      applied.push(`scripts.${key}`);
    }
  }
}

// 保持目标自身的 key 顺序（不重排，避免 diff 爆炸）；只在缺 key 时追加到末尾。
fs.writeFileSync(destPath, `${JSON.stringify(dest, null, 2)}\n`, "utf8");

console.log(
  applied.length
    ? `[merge-package-json] 已用 release 侧覆盖：${applied.join("、")}`
    : "[merge-package-json] 发布身份字段一致，无需覆盖",
);
