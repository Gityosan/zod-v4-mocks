# CLI & Shared Config File

`zod-v4-mocks` ships with a small CLI for ad-hoc generation and a shared config file mechanism that both the CLI and your runtime code (tests, scripts) load the same way.

## CLI

The `zod-v4-mocks` binary loads a JS/ESM module, picks a Zod schema export, and prints (or writes) mock data.

```bash
# Single mock to stdout (pretty-printed JSON)
npx zod-v4-mocks generate ./schemas.js User --pretty

# 50 mocks to a file
npx zod-v4-mocks generate ./schemas.js User --count 50 --output users.json

# Specify seed and locale
npx zod-v4-mocks generate ./schemas.js User --seed 42 --locale ja
```

For TypeScript schema modules, run through `tsx`:

```bash
npx tsx node_modules/zod-v4-mocks/dist/cli.js generate ./schemas.ts User -c 10
```

### Options

| Flag | Description |
|---|---|
| `-c, --count <n>` | Number of items. `count > 1` produces an array; `count = 1` produces a single value. |
| `-s, --seed <n>` | Random seed (default `1`). |
| `-o, --output <path>` | Write to a file. Format is inferred from the extension. |
| `-f, --format <fmt>` | Output format: `json` / `ts` / `js` / `bin`. Overrides the extension. |
| `-l, --locale <loc>` | Faker locale (e.g. `ja`, `en`, `de`). |
| `--pretty` | Pretty-print JSON on stdout. |
| `--silent` | Suppress progress and informational messages. |
| `--config <path>` | Explicit config file. Auto-discovered when omitted. |
| `--profile <name>` | Config profile: `base` / `cli` / `test` (default `cli`). |

For large batches written to a file, the CLI shows a progress indicator (it never draws on stdout — that would corrupt your output).

## Shared Config File

A `zod-v4-mocks.config.{ts,js,mjs}` file expresses project-wide generator setup that's reused by the CLI **and** by your runtime code. Loading is handled by [`c12`](https://github.com/unjs/c12), so TypeScript configs work without any extra tooling, and the file is auto-discovered from the working directory.

### Three layers

`defineMockConfig` takes one required factory (`baseConfig`) and two optional extension callbacks (`extend.cliConfig` / `extend.testConfig`). Each extension receives the base generator and returns an enriched one.

```ts
// zod-v4-mocks.config.ts
import { defineMockConfig } from 'zod-v4-mocks/config'
import { UserId, FIXED_UUID } from './src/schemas/ids'

export default defineMockConfig({
  // Project-wide defaults (used by every profile).
  baseConfig: ({ initGenerator }) =>
    initGenerator({ locale: 'ja', keyMapping: 'auto' })
      .supplyRef(UserId, FIXED_UUID),

  extend: {
    // Applied when run from the CLI.
    cliConfig: (base) =>
      base.updateConfig({ seed: 1 })
        .supplyPath(['createdAt'], new Date('2024-01-01')),

    // Applied when consumed from tests.
    testConfig: (base) =>
      base.override((schema, opts) => /* test-only rules */ undefined),
  },
})
```

Use the layers for what they're good at:

| Layer | What belongs here |
|---|---|
| `baseConfig` | `locale`, `customMockKey`, `consistentKey`, project-wide `supplyRef`, `keyMapping` policy |
| `extend.cliConfig` | Defaults that only make sense for ad-hoc CLI generation (fixed seed, output format hints) |
| `extend.testConfig` | Cross-test conventions (`override` rules, additional `supplyRef`) — but per-test overrides should still be chained on the returned generator in the test itself |

### Loading from CLI

The CLI auto-discovers `zod-v4-mocks.config.{ts,js,mjs}` from the current working directory and applies the `cli` profile by default. Override with `--config <path>` and `--profile <name>`.

### Loading from tests / Node code

```ts
import { loadConfig } from 'zod-v4-mocks/config'

const { createBase, createCli, createTest } = await loadConfig()
// createBase / createCli / createTest are factories — calling each returns
// a fresh MockGenerator instance.

beforeEach(() => {
  // Per-test variations are chained on top of the shared base + testConfig.
  gen = createTest()
    .updateConfig({ seed: testCase.seed })
    .supplyPath(['user', 'email'], 'override@x')
})
```

`loadConfig` returns `null` when no config file is found and none was explicitly requested, so the same code path works whether or not a project has a config.

### Why "factory" matters

The chained API mutates the generator (`gen.supplyPath(...)` returns the same instance). If `loadConfig` returned a single shared instance, supplies added in one test would leak into the next. The `create*` factories rebuild the generator from the original `baseConfig` (plus the relevant `extend`) on each call, so each call returns an isolated instance.

```ts
const a = createTest().supplyPath(['note'], 'A')
const b = createTest()                  // b does not see ['note'] -> 'A'
```

### API reference

```ts
import {
  defineMockConfig,
  loadConfig,
  getProfileFactory,
  type ConfigProfile,
  type DefineMockConfigInput,
  type LoadedMockConfig,
} from 'zod-v4-mocks/config'

defineMockConfig({
  baseConfig: ({ initGenerator, z }) => MockGenerator,
  extend?: {
    cliConfig?: (base: MockGenerator) => MockGenerator,
    testConfig?: (base: MockGenerator) => MockGenerator,
  },
})

loadConfig(options?: { cwd?: string; configFile?: string })
  : Promise<LoadedMockConfig | null>

// LoadedMockConfig:
// { configFile?, raw, createBase, createCli, createTest }

getProfileFactory(loaded: LoadedMockConfig, profile?: ConfigProfile)
  : () => MockGenerator
```

## Next Steps

- [Configuration](/guide/configuration) - All `MockConfig` options
- [Custom Generator](/guide/custom-generator) - `supply` / `supplyRef` / `supplyPath` / `override`
- [API Reference](/api/) - Method-level reference
