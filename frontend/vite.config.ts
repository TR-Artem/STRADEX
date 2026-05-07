import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3102',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Ensure absolute paths work
    assetsDir: 'assets',
    sourcemap: false,
  },
});