import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: false,
  splitting: false,
  treeshake: true,
  outDir: 'dist',
  target: 'es2022',
  platform: 'node',
});
