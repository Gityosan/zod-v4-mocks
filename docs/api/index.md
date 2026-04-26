# API Reference

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

## MockGenerator

The class instance returned by `initGenerator()`. It handles mock data generation, customization, and output. All methods (except `generate` / `multiGenerate`) support method chaining.

### generate

```ts
generate<T extends z.ZodType>(schema: T): z.infer<T>
```

Generates a single mock data entry from a schema. The return type is inferred based on the schema's `z.infer<T>`.

```ts
const schema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
})

const mock = generator.generate(schema)
// Type: { id: string; name: string; email: string }
```

::: info Branded Types
Branded types like `z.string().brand<'UserId'>()` are correctly inferred. The generated value follows the inner schema (in this case `string`), but the TypeScript type includes the brand.

```ts
const BrandedUserId = z.string().brand<'UserId'>()
const val = generator.generate(BrandedUserId)
// val's type is string & { __brand: 'UserId' }
```
:::

### multiGenerate

```ts
multiGenerate<T extends Record<string, z.ZodType>>(
  schemas: T
): { [K in keyof T]: z.infer<T[K]> }
```

Generates mock data from multiple schemas at once. The key names are used directly as keys in the result.

```ts
const mocks = generator.multiGenerate({
  user: z.object({ id: z.uuid(), name: z.string() }),
  post: z.object({ id: z.number().int(), title: z.string() }),
})

console.log(mocks.user) // { id: "...", name: "..." }
console.log(mocks.post) // { id: 123, title: "..." }
```

### supply

```ts
supply(constructor: z.core.$constructor<any>, value: any): MockGenerator
```

Sets a fixed value for a specific Zod type. When the same type is set multiple times, the first value set takes priority.

```ts
generator
  .supply(z.ZodString, 'test string')
  .supply(z.ZodEmail, 'test@example.com')
  .generate(schema)
```

### override

```ts
override(customGenerator: CustomGeneratorType): MockGenerator
```

Registers a custom generator function. If the function returns `undefined`, it falls back to the default generation logic.

```ts
const customGen: CustomGeneratorType = (schema, options) => {
  if (schema instanceof z.ZodString) {
    return options.faker.person.fullName()
  }
}

generator.override(customGen).generate(schema)
```

### register

```ts
register(schemas: z.ZodType[]): MockGenerator
```

Registers schemas for consistent data generation. Used together with `consistentKey` to assign the same values to fields that share the same metadata key.

```ts
const UserId = z.uuid().meta({ name: 'UserId' })

generator
  .register([UserId])
  .generate(z.object({ userId: UserId }))
```

`register` internally pre-generates `config.array.max` values for each schema and stores them in the valueStore. When a schema with the same metadata key is found during generation, values are retrieved from the store based on the array index.

### updateConfig

```ts
updateConfig(newConfig?: Partial<MockConfig>): MockGenerator
```

Updates the configuration. Existing `supply` / `override` settings are preserved.

```ts
generator.updateConfig({ seed: 42, array: { min: 5, max: 10 } })
```

### serialize

```ts
serialize(data: unknown, options?: OutputOptions): string
```

Serializes mock data to a string without writing to a file. Returns the same content that `output` would write. Useful when you need to customize the output further before writing it yourself.

```ts
const data = generator.generate(schema)

// Get serialized string (default: TypeScript format)
const content = generator.serialize(data)
// => "export const mockData = {\n  \"id\": \"...\",\n  ...\n};\n"

// Custom export name and header/footer
const content = generator.serialize(data, {
  exportName: 'generatedMockData',
  header: "import type { User } from './types';",
  footer: 'export type MockData = typeof generatedMockData;',
})
```

### serializeBinary

```ts
serializeBinary(data: unknown): Buffer
```

Serializes data to a binary `Buffer` using Node.js's structured clone algorithm (`v8.serialize`). Preserves `Date`, `Map`, `Set`, `RegExp`, `BigInt`, `TypedArray`, `undefined`, and circular references with no information loss. The result is only readable in a Node.js environment via `deserialize` (or `v8.deserialize`).

```ts
const data = generator.generate(schema)
const buf = generator.serializeBinary(data) // Buffer
```

### deserialize

```ts
deserialize(input: Buffer | Uint8Array | string): unknown
```

Restores a value previously serialized via `serializeBinary` or `output({ binary: true })`. Pass either a `Buffer`/`Uint8Array` or a path to a `.bin` file.

```ts
// From a Buffer
const restored = generator.deserialize(generator.serializeBinary(data))

// From a .bin file written next to a wrapper by output({ binary: true })
generator.output(data, { path: './mocks/user.ts', binary: true, schema })
const restored = generator.deserialize('./mocks/user.bin')
```

### output

```ts
output(data: unknown, options?: OutputOptions): string
```

Outputs mock data to a file. Only works in Node.js environments. Returns the output path as a string.

```ts
const data = generator.generate(schema)

// Output as TypeScript file (default)
generator.output(data)
// => "./__generated__/generated-mock-data.ts"

// Specify path and extension
generator.output(data, { path: './mocks/user.json' })
generator.output(data, { path: './mocks/user.ts' })
generator.output(data, { path: './mocks/user.js' })

// `binary: true` — for ts/js output, writes a thin ESM wrapper plus a sibling
// <name>.bin produced by v8.serialize. The wrapper lazily deserializes the
// .bin on import, so the module behaves like normal `import { mockData }`
// but preserves Date / Map / Set / RegExp / BigInt / TypedArray / undefined /
// circular refs losslessly. Pass `schema` with `ext: 'ts'` to have the wrapper
// typed via a TypeScript type inferred from the schema.
generator.output(data, { path: './mocks/user.ts', binary: true, schema })
generator.output(data, { path: './mocks/user.js', binary: true })

// Custom export name with header/footer
generator.output(data, {
  path: './mocks/user.ts',
  exportName: 'generatedMockData',
  header: "import type { User } from './types';",
  footer: 'export type MockData = typeof generatedMockData;',
})
```

#### OutputOptions

```ts
type OutputOptions = {
  path?: string                    // output path (default: ./__generated__/generated-mock-data.<ext>)
  ext?: 'json' | 'js' | 'ts'       // extension (inferred from path, defaults to 'ts')
  exportName?: string              // custom export variable name (default: 'mockData', ts/js only)
  header?: string                  // string prepended to the output content (ignored for json)
  footer?: string                  // string appended to the output content (ignored for json)
  binary?: boolean                 // for ts/js, write a <name>.bin and a wrapper that deserializes it; ignored for json
  schema?: z.ZodType               // schema used to infer the TS type annotation when ext='ts' && binary=true (falls back to `unknown`)
}
```

#### Output Formats

| Extension | Format | Special Type Handling |
|--------|------|-------------|
| `.ts` / `.js` | `export const <exportName> = ...` | Accurately serializes Date, BigInt, Map, Set, Symbol, File, Blob |
| `.ts` / `.js` + `binary: true` | ESM wrapper + sibling `.bin` (v8 structured clone) | Preserves Date, Map, Set, RegExp, BigInt, TypedArray, `undefined`, circular refs. With `ext: 'ts'`, the wrapper is typed from the passed `schema`. Node.js only. |
| `.json` | JSON | Date as ISO string, BigInt as string, Map/Set/Symbol lose information (with warnings). `binary` is ignored. |

::: warning Data Loss in JSON Output
When outputting data containing types that cannot be represented in JSON (BigInt, Symbol, Map, Set, File, Blob) as `.json`, data accuracy is lost. Warning messages will be displayed, so consider using `.ts` / `.js` (optionally with `binary: true`) instead.
:::

::: info `binary: true` (lossless round-trip)
With `binary: true`, `output()` writes two files:

- `<name>.bin` — raw `v8.serialize` Buffer. Perfectly preserves every value Zod can generate, including circular references.
- `<name>.ts` / `<name>.js` — a thin ESM wrapper that lazily `v8.deserialize`s the sibling `.bin` at import time, so consumers just do `import { mockData } from './user'` with no awareness of the binary representation.

With `ext: 'ts'`, pass the Zod `schema` to have the wrapper emit a TypeScript type annotation so `mockData` is typed without hand-written casts. The `.bin` filename is always derived from the wrapper's basename and cannot be customized separately. The wrapper targets ESM (`import.meta.url`) and is Node.js only.
:::

## Type Definitions

### MockConfig

```ts
interface MockConfig {
  /** @default [en, base] */
  locale?: LocaleType | LocaleType[]
  /** @default generateMersenne53Randomizer() from faker.js */
  randomizer?: Randomizer
  /** @default 1 */
  seed: number
  /** @default { min: 1, max: 3 } */
  array: { min: number; max: number }
  /** @default { min: 1, max: 3 } */
  map: { min: number; max: number }
  /** @default { min: 1, max: 3 } */
  set: { min: number; max: number }
  /** @default { min: 1, max: 3 } */
  record: { min: number; max: number }
  /** @default 0.5 */
  optionalProbability: number
  /** @default 0.5 */
  nullableProbability: number
  /** @default 0.5 */
  defaultProbability: number
  /** @default 5 @deprecated Use recursiveDepthLimit instead */
  lazyDepthLimit: number
  /** @default 5 */
  recursiveDepthLimit?: number
  /** Metadata key name (used with register) */
  consistentKey?: string
}
```

See the [Configuration Guide](/guide/configuration) for details on each setting.

### CustomGeneratorType

```ts
type CustomGeneratorType = (
  schema: z.core.$ZodType,
  options: GeneraterOptions,
) => unknown | undefined
```

When `undefined` is returned, the default generation logic is used.

### GeneraterOptions

```ts
type GeneraterOptions = {
  faker: Faker                          // seeded faker instance
  config: MockConfig                    // current configuration
  customGenerator?: CustomGeneratorType // custom generator
  registry: z.core.$ZodRegistry | null  // schema registry
  valueStore?: Map<string, unknown[]>   // pre-generated values from register
  arrayIndexes: number[]                // current array indexes
  pinnedHierarchy: Map<string, number>  // hierarchy for consistent generation
  circularRefs: Map<z.core.$ZodType, number> // circular reference depth tracking
}
```

In custom generators for `override`, you will mainly use `faker` and `config`.

### OutputOptions

```ts
type OutputOptions = {
  path?: string
  ext?: 'json' | 'js' | 'ts'
  exportName?: string
  header?: string
  footer?: string
  binary?: boolean
  schema?: z.ZodType
}
```

## Export List

```ts
import {
  initGenerator,        // factory function
  type MockGenerator,   // generator class type
  type MockConfig,      // configuration type
  type CustomGeneratorType,  // custom generator type
  type GeneraterOptions,     // generation options type
  type OutputOptions,        // output options type
  type LocaleType,           // locale type
  type Faker,                // faker.js Faker type (re-export)
  type Randomizer,           // faker.js Randomizer type (re-export)
} from 'zod-v4-mocks'
```
