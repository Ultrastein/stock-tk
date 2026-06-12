import { defineConfig } from 'vite'

export default defineConfig({
  root: 'public',          // index.html lives in public/
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:3001',  // backend port
    },
  },
})
