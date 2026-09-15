import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Forwards /api/* to the Express server during `npm run dev`, so the
    // frontend can call fetch('/api/...') without a CORS setup - same
    // origin as far as the browser is concerned.
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
