import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: 'public',          // index.html lives in public/
  publicDir: 'public',     // static assets (icons, manifest, sw.js)
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'public/index.html'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:3001',  // backend port
    },
  },
})
