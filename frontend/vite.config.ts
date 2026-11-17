import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // '@/components/ui/button' means 'src/components/ui/button' (used by shadcn/ui)
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  server: {
    // In dev, send /api requests to the Express server
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
