# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2026-03-12

### Fixed
- Fixed compatibility with Zod v4.0.0–v4.2.x (v2.0.0–v2.0.4 would crash on older Zod v4 versions due to missing classes: `ZodMAC`, `ZodCodec`, `ZodXor`, `ZodExactOptional`)
- Added `safeInstanceof` helper to safely handle classes that don't exist in older Zod versions

### Changed
- Moved `zod` from `dependencies` to `peerDependencies` (`^4.0.0`) to avoid duplicate Zod instances and broken `instanceof` checks
- Upgraded `@faker-js/faker` from 9.8.0 to 10.3.0 (with fallback for stricter word length validation)
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
