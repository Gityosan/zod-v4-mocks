import { defineConfig, type UserConfig } from 'tsdown';

// Browser build only. `node:*` builtins are pulled in by `utils/output.ts`
// (file writing + `node:v8` binary). The core — generate/multiGenerate,
// `serializeOutput` (string), and seroval-based portable serialization — does
// not touch them, so we replace the builtins with browser-safe stubs: pure
// path helpers plus `existsSync`/`mkdirSync` that let code reach the actual
// write, where a clear "Node-only" error is thrown. This keeps the bundle
// loadable in the browser while making the unsupported file/v8 paths fail
// loudly instead of silently doing nothing.
const NODE_STUB_ID = '\0zod-v4-mocks:node-stub';
const nodeStubPlugin = {
  name: 'node-builtin-stub',
  resolveId(id: string) {
    return id.startsWith('node:') ? NODE_STUB_ID : null;
  },
  load(id: string) {
    if (id !== NODE_STUB_ID) return null;
    return `
const nodeOnly = (name) => () => {
  throw new Error(
    name + ' is not available in the browser build of zod-v4-mocks. ' +
    'File output (output/outputAsync) and v8 binary helpers ' +
    '(serializeBinary/deserializeBinary) are Node-only. In the browser use ' +
    'generate()/multiGenerate(), serializeOutput(), or serializePortable().'
  );
};
export const existsSync = () => false;
export const mkdirSync = () => {};
export const readFileSync = nodeOnly('readFileSync');
export const writeFileSync = nodeOnly('writeFileSync');
export const mkdir = async () => {};
export const writeFile = nodeOnly('writeFile');
export const dirname = (p) => {
  const s = String(p).replace(/\\/+$/, '');
  const i = s.lastIndexOf('/');
  return i < 0 ? '.' : i === 0 ? '/' : s.slice(0, i);
};
export const basename = (p, ext) => {
  let b = String(p).replace(/\\/+$/, '').split('/').pop() || '';
  if (ext && b.length > ext.length && b.endsWith(ext)) b = b.slice(0, -ext.length);
  return b;
};
export const extname = (p) => {
  const m = /(\\.[^.\\/]+)$/.exec(String(p).split('/').pop() || '');
  return m ? m[1] : '';
};
export const join = (...parts) =>
  parts.filter(Boolean).join('/').replace(/\\/+/g, '/');
export const serialize = nodeOnly('serializeBinary (node:v8)');
export const deserialize = nodeOnly('deserializeBinary (node:v8)');
export default {};
`;
  },
};

// Shared options. `fixedExtension: false` keeps `.js`/`.d.ts` output (the
// package is `type: module`), matching the existing `exports`/`bin` paths;
// tsdown would otherwise emit `.mjs` on the node platform. `hash: false` gives
// the shared chunk a stable, readable name instead of a content hash.
const shared: UserConfig = {
  format: ['esm'],
  clean: false,
  sourcemap: false,
  treeshake: true,
  outDir: 'dist',
  target: 'es2022',
  platform: 'node',
  fixedExtension: false,
  hash: false,
};

// Two builds: the public library entries ship .d.ts and share a common chunk;
// the CLI is a self-contained bin and needs no type declarations (mirrors the
// previous tsup `dts.entry` setup).
export default defineConfig([
  {
    ...shared,
    entry: { index: 'src/index.ts', config: 'src/config.ts' },
    dts: { oxc: true },
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
  {
    // Browser-targeted ESM, published as the `"browser"` export condition so
    // CDNs (esm.sh / jsdelivr) and bundlers pick it up automatically. Single
    // entry → self-contained file (no shared chunk). Reuses `index.d.ts` for
    // types, so no `.d.ts` is emitted here.
    ...shared,
    platform: 'browser',
    entry: { 'index.browser': 'src/index.ts' },
    dts: false,
    plugins: [nodeStubPlugin],
  },
]);
