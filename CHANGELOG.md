# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.1] - 2026-03-04

### Fixed
- Fixed "Invalid record key type" error when using `z.partialRecord()` (68% failure rate → 0%)
- Changed `ZodNever` handler to return `OMIT_SYMBOL` instead of `null`
- Updated `record` and `map` handlers to properly skip entries with `OMIT_SYMBOL` keys
- Updated `array` handler to filter out `OMIT_SYMBOL` values
- Added warning for `tuple` handler when `OMIT_SYMBOL` is present

## [1.2.0] - (Previous release)

- Previous changes...
