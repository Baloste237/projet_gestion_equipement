import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // 5173 est dans une plage de ports réservée par Windows (Hyper-V) sur certains postes : on utilise 3000
  server: { port: 3000, strictPort: true },
})
