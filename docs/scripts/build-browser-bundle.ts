import { build } from 'esbuild'
import { mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outdir = resolve(__dirname, '../public/browser-bundles')

mkdirSync(outdir, { recursive: true })

// Bundle 1: zod as browser ESM
await build({
  stdin: {
    contents: `export * from 'zod'; export { z } from 'zod';`,
    resolveDir: resolve(__dirname, '../..'),
    loader: 'ts',
  },
  bundle: true,
  format: 'esm',
  outfile: resolve(outdir, 'zod.esm.js'),
  platform: 'browser',
  target: 'es2022',
  minify: true,
})

console.log('Built zod.esm.js')

// Bundle 2: zod-v4-mocks + dependencies (excluding zod)
await build({
  stdin: {
    contents: `export * from '../../src/index.ts';`,
    resolveDir: resolve(__dirname),
    loader: 'ts',
  },
  bundle: true,
  format: 'esm',
  outfile: resolve(outdir, 'zod-v4-mocks.esm.js'),
  platform: 'browser',
  target: 'es2022',
  minify: true,
  external: ['zod'],
  // Replace Node.js modules used in output.ts with stubs
  plugins: [
    {
      name: 'node-stub',
      setup(build) {
        build.onResolve({ filter: /^node:/ }, (args) => ({
          path: args.path,
          namespace: 'node-stub',
        }))
        build.onLoad({ filter: /.*/, namespace: 'node-stub' }, () => ({
          contents: `
            export const existsSync = () => false;
            export const mkdirSync = () => {};
            export const writeFileSync = () => {};
            export const dirname = (p) => p;
            export default {};
          `,
          loader: 'js',
        }))
      },
    },
  ],
})

console.log('Built zod-v4-mocks.esm.js')

// Report sizes
import { statSync } from 'node:fs'
for (const file of ['zod.esm.js', 'zod-v4-mocks.esm.js']) {
  const size = statSync(resolve(outdir, file)).size
  console.log(`  ${file}: ${(size / 1024).toFixed(1)} KB`)
}
