import { defineConfig } from 'tsdown';

// Shared options. `fixedExtension: false` keeps `.js`/`.d.ts` output (the
// package is `type: module`), matching the existing `exports`/`bin` paths;
// tsdown would otherwise emit `.mjs` on the node platform. `hash: false` gives
// the shared chunk a stable, readable name instead of a content hash.
const shared = {
  format: ['esm'] as const,
  clean: false as const,
  sourcemap: false,
  treeshake: true,
  outDir: 'dist',
  target: 'es2022',
  platform: 'node' as const,
  fixedExtension: false,
  hash: false,
};

// Two builds: the public library entries ship .d.ts and share a common chunk;
// the CLI is a self-contained bin and needs no type declarations (mirrors the
// previous tsup `dts.entry` setup).
export default defineConfig([
  {
    ...shared,
    entry: { index: 'src/index.ts', config: 'src/config.ts', greft: 'src/greft.ts' },
    dts: true,
    clean: true,
  },
  {
    ...shared,
    // `cli.ts` lazily `import()`s `./mcp`, so both share this build. The MCP
    // SDK is externalised (optional dependency) and resolved from node_modules
    // at runtime; only consumers that run `mcp` need it installed.
    entry: { cli: 'src/cli.ts', mcp: 'src/mcp.ts' },
    dts: false,
  },
]);
