import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/extension.ts'],
  external: ['vscode'],
  format: ['cjs'],
  shims: false,
  outDir: 'out',
  clean: true,
  sourcemap: true,
});
