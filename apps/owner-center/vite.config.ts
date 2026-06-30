import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['@acc-reliability/sdk'],
  },
  build: {
    commonjsOptions: {
      // Include workspace SDK (CJS output) so Rollup can resolve named exports.
      include: [/platform[\\/]sdk[\\/]dist/, /node_modules/],
    },
  },
});
