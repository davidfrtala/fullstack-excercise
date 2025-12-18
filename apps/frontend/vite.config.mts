/// <reference types='vitest' />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { fileURLToPath } from 'node:url';
import * as path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/frontend',
  server: {
    port: 8000,
    host: '0.0.0.0',
  },
  preview: {
    port: 8200,
    host: '0.0.0.0',
  },
  hmr: {
    host: '0.0.0.0',
    port: 8000,
  },
  plugins: [react(), nxViteTsPaths()],
  resolve: {
    alias: {
      '@homework/ui/*': path.resolve(__dirname, '../../libs/ui/src/ui/*'),
      '@homework/ui/utils': path.resolve(__dirname, '../../libs/ui/src/utils'),
      '@homework/styles/*': path.resolve(
        __dirname,
        '../../libs/ui/src/styles/*'
      ),
    },
  },
  build: {
    outDir: './dist',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
}));
