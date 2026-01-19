import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Ensure relative paths for static deployment compatibility
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});