import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/helpers/prisma-mock.ts'],
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
