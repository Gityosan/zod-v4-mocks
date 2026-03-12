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
  path?: string                // output path (default: ./__generated__/generated-mock-data.ts)
  ext?: 'json' | 'js' | 'ts'  // extension (inferred from path, defaults to 'ts')
  exportName?: string          // custom export variable name (default: 'mockData', ts/js only)
  header?: string              // string prepended to the output content (ignored for JSON)
  footer?: string              // string appended to the output content (ignored for JSON)
}
```

#### Output Formats

| Extension | Format | Special Type Handling |
|--------|------|-------------|
| `.ts` / `.js` | `export const <exportName> = ...` | Accurately serializes Date, BigInt, Map, Set, Symbol, File, Blob |
| `.json` | JSON | Date as ISO string, BigInt as string, Map/Set/Symbol lose information (with warnings) |

::: warning Data Loss in JSON Output
When outputting data containing types that cannot be represented in JSON (BigInt, Symbol, Map, Set, File, Blob) as `.json`, data accuracy is lost. Warning messages will be displayed, so consider using `.ts` or `.js` format instead.
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
