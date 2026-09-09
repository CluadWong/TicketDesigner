import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";

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
export default defineConfig({
  plugins: [vue()],
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
