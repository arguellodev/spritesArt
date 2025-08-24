import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
//import react from '@vitejs/plugin-react-swc'
export default defineConfig({
  base: './',
  plugins: [
    react({
      babel: {
        plugins: [
          ['babel-plugin-react-compiler', {
            compilationMode: 'all'
          }]
        ],
      },
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
