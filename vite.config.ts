import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // 应用构建与库构建分离：应用产物 → dist-app，库产物（vite.lib.config.ts）→ dist，
    // 避免 `npm run build` 与 `npm run build:lib` 互相覆盖。
    outDir: "dist-app",
    // 多页入口：设计器（index.html → /src/main.ts）与消费页演示（preview.html → /src/preview/main.ts）并存。
    // 开发期 `vite` 后分页访问 /index.html 与 /preview.html；`vite build` 会产出两个 HTML 入口。
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        preview: fileURLToPath(new URL('./preview.html', import.meta.url)),
      },
    },
  },
})
