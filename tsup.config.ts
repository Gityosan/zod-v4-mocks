import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    cli: 'src/cli.ts',
    config: 'src/config.ts',
  },
  format: ['esm'],
  dts: { entry: { index: 'src/index.ts', config: 'src/config.ts' } },
  clean: true,
  sourcemap: false,
  splitting: false,
  treeshake: true,
  outDir: 'dist',
  target: 'es2022',
  platform: 'node',
});
