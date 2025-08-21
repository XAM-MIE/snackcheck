/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    testTimeout: 10000, // 10 second timeout for comprehensive tests
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})