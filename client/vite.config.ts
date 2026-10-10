import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const sharedDir = fileURLToPath(new URL('../shared', import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@shared': sharedDir },
  },
  server: {
    // shared/ lives outside client/, so the dev server must be allowed to read it.
    fs: { allow: ['..'] },
    proxy: { '/api': 'http://localhost:3000' },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
