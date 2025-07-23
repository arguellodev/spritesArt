import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  base: './',   // <-- Esta línea es clave para que funcione en electron empaquetado
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
