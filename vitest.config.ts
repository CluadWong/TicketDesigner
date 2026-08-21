import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vitest.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    // 默认 jsdom 环境（Vue 组件测试需要 DOM）
    environment: 'jsdom',
    include: ['src/**/__tests__/**/*.test.ts'],
  },
})
