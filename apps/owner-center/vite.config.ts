import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Workspace packages symlink to platform/*/dist (outside node_modules). Rollup's
// CJS plugin must transform all of them or raw `exports`/`require` leak into
// the browser bundle.
const workspaceCjsDist = /platform[\\/](sdk|kernel|services|storage)[\\/]dist/;

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      '@acc-reliability/sdk',
      '@acc-reliability/kernel',
      '@acc-reliability/services',
      '@acc-reliability/storage',
    ],
  },
  build: {
    commonjsOptions: {
      include: [workspaceCjsDist, /node_modules/],
    },
  },
});
