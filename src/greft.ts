// Re-export greft-codec's codec so generated `binary: true` wrappers can
// `import { decode } from 'zod-v4-mocks/greft'` instead of reaching into the
// transitive `greft-codec` dependency directly. A generated wrapper lives in
// the consumer's project, where `greft-codec` (our internal dependency) is not
// guaranteed to be resolvable under strict, non-hoisting installs like pnpm —
// but `zod-v4-mocks` always is (they used it to generate the file). This keeps
// `greft-codec` a private implementation detail of zod-v4-mocks.
export { decode, encode } from 'greft-codec';
