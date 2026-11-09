import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build:single` produces one self-contained HTML file you can double-click to play offline.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react(), mode === 'single' && viteSingleFile()].filter(Boolean),
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    assetsInlineLimit: mode === 'single' ? 100000000 : 4096,
    chunkSizeWarningLimit: 4000,
  },
  server: { port: 5173, open: false },
}));
