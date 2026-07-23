import { defineConfig } from 'vite';
import path from 'node:path';

// Host-page loader build: a tiny framework-free IIFE exposing `window.ArtSpace`.
export default defineConfig({
  root: __dirname,
  resolve: {
    alias: { '@': path.resolve(__dirname, '../src') },
  },
  build: {
    outDir: 'dist/loader',
    emptyOutDir: true,
    lib: {
      entry: path.resolve(__dirname, 'src/loader.ts'),
      name: 'ArtSpace',
      formats: ['iife'],
      fileName: () => 'artspace.js',
    },
  },
});
