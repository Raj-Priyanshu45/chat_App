import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // The backend's default FRONTEND origin is http://localhost:3000 (CORS + WebSocket
  // allowed-origin), so run the dev server on that port instead of Vite's 5173.
  server: { port: 3000 },
})
