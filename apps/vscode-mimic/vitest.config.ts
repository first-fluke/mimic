import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      vscode: path.resolve(__dirname, './src/test/mocks/vscode.ts'),
    },
  },
});
