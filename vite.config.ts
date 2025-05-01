import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './', // or '/' depending on your routing setup
  plugins: [react()],
  optimizeDeps: {
    include: ['lucide-react'],
  },
});
