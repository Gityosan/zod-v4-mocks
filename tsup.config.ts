import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts', cli: 'src/cli.ts' },
  format: ['esm'],
  dts: { entry: 'src/index.ts' },
  clean: true,
  sourcemap: false,
  splitting: false,
  treeshake: true,
  outDir: 'dist',
  target: 'es2022',
  platform: 'node',
});
