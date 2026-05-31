# API Reference

`zod-v4-mocks` exposes a single factory, `initGenerator`, which returns a
`MockGenerator`. Every other capability — generation, customization,
serialization, and file output — is a method on that instance.

This reference is split into focused pages:

- **[Generation](/api/generation)** — `generate`, `multiGenerate`, `generateMany`, `factory`
- **[Customization](/api/customization)** — `supply`, `supplyRef`, `supplyPath`, `override`, `register`, `updateConfig`
- **[Serialization & Output](/api/serialization)** — `serialize`, `serializeBinary`, `deserialize`, `serializePortable`, `deserializePortable`, `output`
- **[Types](/api/types)** — `MockConfig`, `CustomGeneratorType`, `GeneraterOptions`, `OutputOptions`, `PortableOptions`, `PathSegment`, and re-exports

## initGenerator

```ts
function initGenerator(config?: Partial<MockConfig>): MockGenerator
```

Creates a `MockGenerator` instance. If `config` is omitted, default settings are used.

```ts
import { initGenerator } from 'zod-v4-mocks'

// Default settings
const generator = initGenerator()

// Custom settings
const generator = initGenerator({
  seed: 42,
  array: { min: 2, max: 5 },
  locale: 'ja',
})
```

See [`MockConfig`](/api/types#mockconfig) for every option, or the
[Configuration Guide](/guide/configuration) for explanations.

## MockGenerator

The class instance returned by `initGenerator()`. It handles mock data
generation, customization, and output.

### Method chaining

Customization and configuration methods return the same instance, so they can
be chained. The terminal methods — those that produce data or strings — do not.

| Method | Returns | Chainable |
|--------|---------|-----------|
| `supply` / `supplyRef` / `supplyPath` | `MockGenerator` | ✅ |
| `override` | `MockGenerator` | ✅ |
| `register` | `MockGenerator` | ✅ |
| `updateConfig` | `MockGenerator` | ✅ |
| `generate` / `multiGenerate` / `generateMany` | data | ❌ |
| `factory` | `{ next, take }` | ❌ |
| `serialize` / `serializeBinary` / `serializeGraft` / `serializePortable*` | `string` / `Buffer` / `Uint8Array` | ❌ |
| `deserialize` / `deserializeGraft` / `deserializePortable` | data | ❌ |
| `output` | output path `string` | ❌ |

```ts
const data = initGenerator({ seed: 42 })
  .supply(z.ZodString, 'fixed')
  .override(customGen)
  .generate(schema)
```

## Export List

```ts
import {
  initGenerator,             // factory function
  ITEM_MARKER,               // '$item' — supplyPath marker for array/set/tuple elements
  VALUE_MARKER,              // '$value' — supplyPath marker for record/map values
  type MockGenerator,        // generator class type
  type MockConfig,           // configuration type
  type CustomGeneratorType,  // custom generator type
  type GeneraterOptions,     // generation options type
  type OutputOptions,        // output options type
  type PortableOptions,      // portable serialization options type
  type PathSegment,          // supplyPath segment type
  type LocaleType,           // locale type
  type Faker,                // faker.js Faker type (re-export)
  type Randomizer,           // faker.js Randomizer type (re-export)
} from 'zod-v4-mocks'
```
