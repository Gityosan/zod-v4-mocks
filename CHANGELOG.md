# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Added `serializeBinary(data)` method on `MockGenerator` — serializes data to a `Buffer` via `v8.serialize` (structured clone), preserving `Date`, `Map`, `Set`, `RegExp`, `BigInt`, `TypedArray`, `undefined`, and circular references with no information loss
- Added `deserialize(input)` method on `MockGenerator` — restores data from a `Buffer`/`Uint8Array` or `.bin` file path
- Added `binary` option to `OutputOptions` — when combined with `ext: 'ts'` or `'js'`, `output()` writes a sibling `<name>.bin` and turns the script into a thin ESM wrapper that `v8.deserialize`s the `.bin` at import time. This gives lossless persistence with normal `import` ergonomics. Silently ignored for `ext: 'json'`
- Added `schema` option to `OutputOptions` — when `ext: 'ts'` and `binary: true`, the passed Zod schema is converted into a TypeScript type annotation so the exported value is typed without hand-written casts

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
