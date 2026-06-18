import { build } from 'esbuild'
import { existsSync, mkdirSync, statSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outdir = resolve(__dirname, '../public/browser-bundles')
const repoRoot = resolve(__dirname, '../..')

// The Playground runs the *shipped* browser build (the package's `"browser"`
// export condition), not an ad-hoc bundle of `src`. So node:* stubbing now
// lives once in the root `tsdown.config.ts`; here we just re-bundle that
// artifact for the browser, inlining the npm deps (faker/randexp/seroval/…)
// that a bare browser import can't resolve while keeping zod external so the
// user code and the mocks bundle share a single zod instance.
const browserEntry = resolve(repoRoot, 'dist/index.browser.js')
if (!existsSync(browserEntry)) {
  throw new Error(
    `Missing ${browserEntry}.\n` +
      `Build the package first: \`pnpm run build\` in the repo root ` +
      `(the root \`doc:dev\` script does this for you).`,
  )
}

mkdirSync(outdir, { recursive: true })

// Bundle 1: zod as browser ESM
await build({
  stdin: {
    contents: `export * from 'zod'; export { z } from 'zod';`,
    resolveDir: repoRoot,
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

// Bundle 2: the official browser build + its deps (excluding zod).
// `dist/index.browser.js` already has node:* replaced with browser-safe stubs,
// so no node stubbing is needed here.
await build({
  entryPoints: [browserEntry],
  bundle: true,
  format: 'esm',
  outfile: resolve(outdir, 'zod-v4-mocks.esm.js'),
  platform: 'browser',
  target: 'es2022',
  minify: true,
  external: ['zod'],
})

console.log('Built zod-v4-mocks.esm.js')

// Report sizes
for (const file of ['zod.esm.js', 'zod-v4-mocks.esm.js']) {
  const size = statSync(resolve(outdir, file)).size
  console.log(`  ${file}: ${(size / 1024).toFixed(1)} KB`)
}
