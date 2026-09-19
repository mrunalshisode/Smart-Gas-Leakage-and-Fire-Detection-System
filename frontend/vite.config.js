import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: '.',
  plugins: [react()],
  cacheDir: './node_modules/.vite',
  server: {
    fs: {
      strict: true,
      allow: ['.'],
    },
  },
  optimizeDeps: {
    noDiscovery: true,
    include: [],
  },
});
