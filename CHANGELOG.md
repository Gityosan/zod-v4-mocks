# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Added `serializeGreft(data)` / `deserializeGreft<T>(input)` methods on `MockGenerator` — lossless binary serialization backed by [`greft-codec`](https://github.com/Gityosan/greft). Unlike the Node-only `serializeBinary` (v8), the `Uint8Array` output round-trips across any JS runtime and can also be decoded in other languages (Python / Rust / Go / …) via a greft-codec port — handy for reusing generated mocks as cross-language test fixtures. Preserves `Date` / `Map` / `Set` / `RegExp` / `BigInt` / `TypedArray` / `undefined` / circular references like `serializeBinary`, plus `Symbol` and `NaN` / `Infinity`
- Added `binary: 'greft'` to `OutputOptions` (and a `greft` CLI format) — writes a sibling `.bin` encoded with greft-codec and an ESM wrapper that reconstructs it via `decode`. The `.bin` is a portable, cross-language artifact. The wrapper imports `decode` from the new `zod-v4-mocks/greft` subpath (a re-export of greft-codec), so consumers of the generated file only need `zod-v4-mocks` installed — not the transitive greft-codec dependency directly. The existing `binary: true` is unchanged and now also accepts the explicit alias `binary: 'v8'`
- Added a `zod-v4-mocks/greft` export subpath that re-exports greft-codec's `decode` / `encode`. Used by `binary: 'greft'` wrappers, and available for hand-decoding `.bin` files without taking a direct greft-codec dependency
- Added a `{ base64: true }` option to `serializeGreft` / `deserializeGreft` (new `GreftOptions` type). `serializeGreft(data, { base64: true })` returns a text-safe `string` instead of `Uint8Array` — pure data with no `node:fs` dependency that embeds directly in JSON / env vars while staying cross-language (any greft port can base64-decode then `decode`). `deserializeGreft(str, { base64: true })` reverses it (the string is treated as data, not a file path)

### Changed
- `OutputOptions.binary` is now `boolean | 'v8' | 'greft'` (was `boolean`). Fully backward compatible: `true` continues to mean the Node-only `v8.serialize` backend

## [3.3.1] - 2026-06-08

### Fixed
- Generating a mock for an empty union — `z.union([])`, `z.xor([])`, or `z.discriminatedUnion(key, [])`, all constructible since Zod 4.4.0 — no longer throws the internal `Cannot get value from empty dataset` error. An empty union matches nothing (it is `never` in disguise), so it is now handled like `z.never()`: the key is omitted inside an object, and a top-level empty union yields `undefined`

## [3.3.0] - 2026-06-07

### Added
- Added an **MCP (Model Context Protocol) server** exposed via `npx zod-v4-mocks mcp` (stdio transport). Lets agents discover and generate mocks from your Zod schemas with four tools: `usage` (explains the server and workflow), `list_schemas` (lists the Zod schema exports in a module), `preflight` (reports constructs that cannot be safely mocked, without generating), and `generate_mock` (module path + export + `count`/`seed`/`locale`/`format`/`pretty`/`config`/`profile`). Schemas are referenced by file path — the same contract as the `generate` CLI command. `@modelcontextprotocol/sdk` is an `optionalDependency` (installed automatically by `npx`); if it is absent, the `mcp` command prints install instructions

## [3.2.0] - 2026-05-28

### Added
- Added `serializePortable(data)` / `serializePortableAsync(data)` / `deserializePortable<T>(input)` methods on `MockGenerator` — cross-runtime serialization backed by `seroval`. Unlike the Node-only `serializeBinary` (v8), output round-trips across any JS runtime (Node ↔ browser, browser ↔ browser) and preserves `Date`, `RegExp`, `Map`, `Set`, `BigInt`, `TypedArray`, `undefined`, `NaN` / `Infinity`, circular / shared references, and `URL` / `URLSearchParams` / `Headers`. `File` / `Blob` / `FormData` round-trip via the async variant. `Symbol` is supported: registry symbols keep identity; described symbols round-trip by description with shared identity preserved within a payload
- Added `base64` option to the portable methods — text-safe encoding for embedding in JSON, environment variables, or transports that disallow binary
- Added `outputAsync()` method on `MockGenerator` — async counterpart of `output()`. With `{ portable: true }` (`ts` / `js`) it inlines a self-contained `seroval` expression — `export const <name> = <expr>` — that a plain `import` reconstructs in any JS runtime, with no sibling file and no consumer dependency (unlike `binary: true`, which is Node-only v8 + a `.bin`). `File` / `Blob` / `FormData` round-trip with their contents

### Changed
- `output()` (sync) now throws when `portable: true` is requested; use `outputAsync()` instead. Portable mode rejects `Symbol` in this path because an inline `import` has no unbox step

## [3.1.0] - 2026-05-24

### Changed
- Declared `engines.node: ">=20"`. The published package is still plain ESM and runs on Node 20+. No public API changes from 3.0.0 — `import`s, `bin`, and types are identical

## [3.0.0] - 2026-05-19

### Added
- Added `supplyRef(subSchema, value)` — fix a value for a specific schema reference (more precise than `supply`, which targets a Zod constructor)
- Added `supplyPath(path, value)` — fix a value at a specific structural path. Supports object/record/map keys, array/tuple indices, plus markers `'$item'` (array/tuple/set all elements) and `'$value'` (record/map all values). For `record` / `map`, a literal key path *injects* that key even when not randomly produced
- Added `generateMany(schema, count)` and `factory(schema)` — produce N independent mocks for the same schema (`.next()` / `.take(n)`)
- Added `keyMapping` config option — opt-in property-name → faker mapping for primitive leaves (string/number/boolean/date). `'auto'` enables built-in defaults (`name`, `email`, `age`, `createdAt`, ...); a custom `KeyMapper` function may be provided and falls back to defaults when it returns `undefined`
- Added `customMockKey` config option (default `'mock'`) — meta attribute name read for `z.custom()` / `z.instanceof()` schemas. Use `z.custom<T>().meta({ mock: (faker) => ... })` to define a generator
- Added `preflightCheck` config option (default `true`) — a pre-flight schema walk that runs before generation. Error-level findings throw with the offending path; warning-level findings are reported (and auto-fixed when a minimal correction exists). Checks: un-mocked `z.custom()` / `z.instanceof()` at a fixed-length tuple position (error), incompatible `z.intersection()` — mismatched primitive types, or enums with no common value (error), an invalid `z.record()` key type (error), an ignored `.refine()` / `.superRefine()` predicate (warning), an unsatisfiable `min > max` number/bigint range (warning), conflicting `z.string()` checks of the same kind (warning), an unsupported schema type — `z.function()` / `z.promise()` or a type added by a newer Zod (warning), and a recursive `z.lazy()` that is its own recursion anchor (warning + auto-fix). Error-level findings downgrade to warnings when an opaque `supply`/`override` is registered. Set to `false` to skip all checks and fixes
- Added a `zod-v4-mocks` CLI (`bin` entry, built on `citty`/`consola`/`log-update`). Loads a JS/ESM module and generates mocks for a named export to stdout or a file, with progress for large batches. For TS sources, run via `tsx`
- Added the `zod-v4-mocks/config` subpath with `defineMockConfig()` and `loadConfig()` (built on `c12`). Project-level `zod-v4-mocks.config.{ts,js,mjs}` files express a `baseConfig` factory plus optional `extend.cliConfig` / `extend.testConfig` layers; both the CLI and runtime code (tests, scripts) load the same file via `loadConfig()`, which returns `{ createBase, createCli, createTest }` factories that produce fresh `MockGenerator` instances on each call (so chained API calls cannot leak between tests). The CLI gains `--config <path>` (otherwise auto-discovered) and `--profile base|cli|test` flags

### Changed
- `z.custom()` / `z.instanceof()` no longer fall through to the generic "unhandled type" lorem-word fallback. They now require a `meta.mock` definition or `supplyRef`; without one the slot is treated as `OMIT_SYMBOL` (silently dropped from arrays/objects, warned in tuples)
- Warnings for conflicting `z.string()` checks and unsatisfiable numeric ranges are now reported by the pre-flight check (once, before generation, with the schema path) instead of mid-generation. They are no longer emitted when `preflightCheck` is `false`

### Fixed
- Recursive `z.lazy()` no longer stack-overflows when the `z.lazy()` itself is the recursion anchor (e.g. `const Tree = z.lazy(() => z.object({ children: z.array(Tree) }))`). The pre-flight check detects it, warns, and auto-substitutes the unwrapped form so generation terminates at `recursiveDepthLimit`
- `generate()` no longer leaks the internal `OMIT_SYMBOL` sentinel: a bare `z.custom()` / `z.never()` with no value provider at the top level now returns `undefined` with a warning
- `keyMapping` no longer fires on randomly generated `z.record(z.string(), ...)` / `z.map(z.string(), ...)` keys — it now applies only to declared object keys and to records/maps whose key type is a literal or enum
- `supplyPath` array index extension is now capped at a hard limit (10000); a larger index throws instead of attempting an oversized allocation
- `generateMany()` now rejects non-integer / `NaN` / `Infinity` counts instead of silently flooring them
- `updateConfig()` now preserves `supplyPath` registrations (previously dropped) alongside `supply`/`supplyRef`/`override`

## [2.3.1] - 2026-05-13

### Fixed
- Fixed `output({ binary: true })` generated wrapper using `new URL(..., import.meta.url)` which fails under Vitest/Vite (non-`file://` scheme). Now uses `path.join(import.meta.dirname, ...)` instead (requires Node.js 20.11+)

## [2.3.0] - 2026-05-11

### Added
- Added `serializeBinary(data)` method on `MockGenerator` — serializes data to a `Buffer` via `v8.serialize` (structured clone), preserving `Date`, `Map`, `Set`, `RegExp`, `BigInt`, `TypedArray`, `undefined`, and circular references with no information loss
- Added `deserialize<T>(input)` method on `MockGenerator` — restores data from a `Buffer`/`Uint8Array` or `.bin` file path. Accepts an optional generic type parameter to cast the result (e.g. `deserialize<User>('./user.bin')`)
- Added `binary` option to `OutputOptions` — when combined with `ext: 'ts'` or `'js'`, `output()` writes a sibling `<name>.bin` and turns the script into a thin ESM wrapper that `v8.deserialize`s the `.bin` at import time. This gives lossless persistence with normal `import` ergonomics. The wrapper exports the value as `unknown`; cast on the consumer side or use `deserialize<T>()` directly for typing. Silently ignored for `ext: 'json'`

### Changed
- `serialize()` now throws when `binary: true` is combined with `ext: 'ts'` or `'js'` (those variants require writing a sibling `.bin`); use `output()` or `serializeBinary()` instead

## [2.2.0] - 2026-03-12

### Added
- Added `serialize()` method to get serialized output as a string without file I/O
- Added `exportName` option to customize the export variable name in `output()` and `serialize()`
- Added `header` and `footer` options to prepend/append content in `output()` and `serialize()`

### Fixed
- Fixed `header`/`footer` being applied to JSON output, which produced invalid JSON — now ignored for JSON format

## [2.1.0] - 2026-03-12

### Added
- Unified recursive depth limiting for `z.lazy()` and getter-based circular references
- Added `recursiveDepthLimit` config option (deprecates `lazyDepthLimit`)
- Added documentation site with interactive Playground ([gityosan.github.io/zod-v4-mocks](https://gityosan.github.io/zod-v4-mocks/))

### Fixed
- Fixed compatibility with Zod v4.0.0–v4.3.4 (v2.0.0–v2.0.4 used pinned zod v4.3.5 in dependencies and would crash on older Zod v4 versions due to missing classes: `ZodMAC`, `ZodCodec`, `ZodXor`, `ZodExactOptional`)
- Fixed `z.email()` with custom `pattern` — now falls back to `RandExp` when faker-generated email doesn't match the pattern
- Fixed `z.uuid()` for all non-v4 versions (v1, v3, v5, v6, v7, v8) — previously only v6/v7 used regex fallback, now all non-v4 versions do

### Changed
- Moved `zod` from `dependencies` to `peerDependencies` (`^4.0.0`) to avoid duplicate Zod instances and broken `instanceof` checks
- Upgraded `@faker-js/faker` from 9.8.0 to 10.3.0
- Upgraded `es-toolkit` from 1.44.0 to 1.45.1

## [2.0.4] - 2026-03-05

### Changed
- Separated zod/v4 preview support into [zod-v4-preview-mocks](https://www.npmjs.com/package/zod-v4-preview-mocks) package
- Deprecated v1.x series (use `zod-v4-preview-mocks` for zod v3.25.76 preview)
- Updated README and keywords to clarify package scope

## [2.0.3] - 2026-03-04

### Fixed
- Fixed "Invalid record key type" error when using `z.partialRecord()` (68% failure rate → 0%)
- Changed `ZodNever` handler to return `OMIT_SYMBOL` instead of `null`
- Updated `record` and `map` handlers to properly skip entries with `OMIT_SYMBOL` keys
- Added warning for `tuple` handler when `OMIT_SYMBOL` is present

## [2.0.2] - (Previous release)

- Previous changes...
