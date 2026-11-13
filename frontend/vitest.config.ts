import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

// Окрема конфігурація для модульних тестів: без плагінів Vue DevTools
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/model/**/*.ts', 'src/exercises/**/*.ts'],
      exclude: ['**/__tests__/**', 'src/model/index.ts'],
      reporter: ['text', 'html'],
    },
  },
})
