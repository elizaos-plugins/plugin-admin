import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: ['dist', 'node_modules', 'test', '**/*.test.ts', '**/*.spec.ts'],
    },
  },
}); 