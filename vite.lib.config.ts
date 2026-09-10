import { defineConfig, type Plugin } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";
import fs from "node:fs";
import path from "node:path";

/**
 * 组件库构建配置（发布 npm 包用）
 *
 * 与 `vite.config.ts`（应用多页构建，输出到 dist-app）分离，互不干扰。
 * 产物：`dist/{index,renderer,designer}.js` + `dist/ticket-designer.css`
 *
 * 三条硬约束（改前先看 publish-npm.md）：
 *   1. `vue` 必须 external —— 否则宿主会打进第二份 Vue，响应式 / provide-inject / 组件解析全断。
 *      `@panzoom/panzoom` 与 `dompurify` 走 npm 正常安装即可（渲染内核在用，非设计器专属）。
 *   2. 只出 ESM —— 宿主是 Vite，不需要 UMD / CJS。
 *   3. `@/` 别名必须与主配置一致，否则 lib 构建解析失败。
 */
/**
 * CSS 归属修正插件（2026-09-10 修）：**渲染内核样式必须随 designer 入口一起给出**。
 *
 * 背景：`manualChunks` 把 `src/components/renderer-v2/**` 整体归到 `renderer-core` chunk，
 * 而 CSS 只跟随模块所在 chunk 输出一次 —— 于是 `.grid-form-paper` / `.layout-grid__row` /
 * `.paper-viewport` 等渲染内核 scoped 样式全部只落在 `renderer-core.css`。
 * 后果：宿主只引 `@aikkk/ticket-designer/designer/style.css` 时纸张没有白底与阴影、
 * 网格版式塌掉（选中节点时因 `.is-design-selected` 在 designer-ui.css 里才看得到纸）。
 *
 * 修法：构建后把 `renderer-core.css` 内容 **前置拼接** 到 `designer-ui.css`
 * （renderer 在前、designer 在后，保证设计器对渲染内核的覆盖仍然生效，例如
 * `.v2-canvas-surface--preview .grid-form-canvas{padding:24px}`），
 * 并额外产出全量 `ticket-designer.css` 供根入口 `.` 使用。
 *
 * 这样三档样式各自自足，互不污染：
 *   - `renderer/style.css`  → renderer-core.css（纯渲染内核，最小）
 *   - `designer/style.css`  → designer-ui.css（渲染内核 + 设计器 UI，自足）
 *   - `style.css`           → ticket-designer.css（全量，根入口含两端）
 */
function mergeDesignerCss(): Plugin {
  return {
    name: "merge-designer-css",
    apply: "build",
    closeBundle() {
      const distDir = fileURLToPath(new URL("./dist", import.meta.url));
      const core = path.join(distDir, "renderer-core.css");
      const ui = path.join(distDir, "designer-ui.css");
      if (!fs.existsSync(core) || !fs.existsSync(ui)) return;

      const coreCss = fs.readFileSync(core, "utf8");
      const uiCss = fs.readFileSync(ui, "utf8");
      const merged =
        "/* 以下内容内联自 renderer-core.css：设计器复用渲染内核呈现纸张与版式，必须一并加载 */\n" +
        coreCss +
        "\n" +
        uiCss;

      fs.writeFileSync(ui, merged, "utf8");
      fs.writeFileSync(path.join(distDir, "ticket-designer.css"), merged, "utf8");

      // 回归防护：渲染内核的关键选择器必须出现在设计器样式里。
      // 若将来 manualChunks 调整导致 CSS 归属再漂移，构建直接失败，而不是等宿主反馈「纸看不见」。
      const REQUIRED = [".grid-form-paper", ".layout-grid__row", ".paper-viewport"];
      const missing = REQUIRED.filter((sel) => !merged.includes(sel));
      if (missing.length) {
        this.error(
          `designer-ui.css 缺少渲染内核样式（${missing.join("、")}）：` +
            `渲染内核 CSS 未随 designer 入口输出，宿主只引 designer/style.css 会丢纸张与版式样式。`,
        );
      }
    },
  };
}

export default defineConfig({
  plugins: [vue(), mergeDesignerCss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false, // 发布包不带 sourcemap（体积减半）；需排查时临时改 true 本地构建
    // 按入口拆分 CSS：否则三个入口的样式会合并成一个文件，
    // 只引 renderer 的宿主会被迫加载设计器样式（.v2-toolbar 等），污染全局。
    cssCodeSplit: true,
    lib: {
      entry: {
        index: fileURLToPath(new URL("./src/index.ts", import.meta.url)),
        renderer: fileURLToPath(new URL("./src/renderer.ts", import.meta.url)),
        designer: fileURLToPath(new URL("./src/designer.ts", import.meta.url)),
      },
      formats: ["es"],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: ["vue", "@panzoom/panzoom", "dompurify"],
      output: {
        // [name] 跟随入口/chunk：renderer-core.css / designer-ui.css 各归各的
        assetFileNames: "[name].[ext]",
        chunkFileNames: "chunks/[name].js",
        // 固定 chunk 归属，让 CSS 文件名稳定且语义正确：
        // 不指定的话，renderer 的样式会跟着共享 chunk 被命名成 collectFieldValues.css
        manualChunks(id) {
          if (id.includes("node_modules")) return;
          if (id.includes("/src/components/designer/")) return "designer-ui";
          if (id.includes("/src/")) return "renderer-core";
        },
      },
    },
  },
});
