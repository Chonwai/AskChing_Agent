import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: [
      {
        find: '@askching/mcp-server/tools.js',
        replacement: fileURLToPath(new URL('./packages/mcp-server/src/tools.ts', import.meta.url)),
      },
      {
        find: '@askching/shared',
        replacement: fileURLToPath(new URL('./packages/shared/src/index.ts', import.meta.url)),
      },
    ],
  },
  test: {
    include: ['packages/**/*.test.ts', 'evals/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '.getsuperpower/**'],
  },
});
