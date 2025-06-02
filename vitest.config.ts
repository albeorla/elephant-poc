import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    server: {
      deps: {
        inline: ['next-auth', 'next']
      }
    }
  },
  resolve: {
    alias: {
      '~': resolve(__dirname, './src'),
      'next/server': resolve(__dirname, './node_modules/next/dist/server/web/exports/index.js'),
    },
  },
}) 