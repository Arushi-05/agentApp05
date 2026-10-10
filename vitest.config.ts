import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const rootModules = fileURLToPath(new URL('./node_modules', import.meta.url));

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  resolve: {
    alias: [
      // client/ has its own node_modules; force one React copy so hooks work under test.
      { find: /^react(-dom)?(\/.*)?$/, replacement: `${rootModules}/react$1$2` },
      { find: /^@shared\/(.*)$/, replacement: fileURLToPath(new URL('./shared/$1', import.meta.url)) },
    ],
  },
});
