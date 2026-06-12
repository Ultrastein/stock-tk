import { defineConfig } from 'vite'

export default defineConfig({
  root: 'public',
  base: './',               // relative assets — works on any subpath (GitHub Pages)
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
