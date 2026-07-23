import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Iframe application build: the hosted editor the loader points at.
export default defineConfig({
  root: __dirname,
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, '../src') },
  },
  build: {
    outDir: 'dist/iframe',
    emptyOutDir: true,
  },
});
