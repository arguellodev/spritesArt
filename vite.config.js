import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Esto habilita el acceso en red local
    port: 5173, // Opcional: puedes especificar un puerto si lo deseas
  },
})
