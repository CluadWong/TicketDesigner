import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vitest.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // jsdom 下真实 UMD 默认导出在 CJS 互操作中不可调用，用轻量替身覆盖（生产构建走 vite.config，不受影响）。
      '@panzoom/panzoom': fileURLToPath(new URL('./src/test-utils/panzoom-stub.ts', import.meta.url)),
    },
  },
  test: {
    globals: true,
    // 默认 jsdom 环境（Vue 组件测试需要 DOM）
    environment: 'jsdom',
    include: ['src/**/__tests__/**/*.test.ts'],
  },
})
