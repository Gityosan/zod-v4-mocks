# Custom Generator

You can set custom values or generator functions for specific schemas. There are five methods available -- `supply`, `supplyRef`, `supplyPath`, `override`, and `register` -- each designed for a different grain of control:

| Method | Targets | When to use |
|---|---|---|
| `supply` | A Zod *constructor* (`z.ZodString`, ...) | "All strings should be X" |
| `supplyRef` | A specific *schema reference* | "This particular sub-schema should be X" |
| `supplyPath` | A *path* inside the generated tree | "The `user.email` slot should be X" |
| `override` | An arbitrary *function* over schema + context | "Anything I can express as code" |
| `register` | Related schemas for value consistency | "Same UUID across `User.id` / `Comment.userId`" |

## supply - Setting Fixed Values

Assigns **fixed values** to specific Zod type classes. Best suited for simple cases like "always use this value for this schema type."

```ts
import { z } from 'zod'
import { initGenerator } from 'zod-v4-mocks'

const schema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
})

const mock = initGenerator()
  .supply(z.ZodString, 'Test User')
  .supply(z.ZodEmail, 'test@example.com')
  .generate(schema)

// => { id: "08e93b6a-...", name: "Test User", email: "test@example.com" }
```

### Characteristics of supply

- Specify a Zod type constructor to set the same value for all instances of that type
- Multiple `supply` calls can be chained
- When the same type is set multiple times, the **first value set takes priority**

```ts
const mock = initGenerator()
  .supply(z.ZodEmail, 'first@example.com')   // this one takes priority
  .supply(z.ZodEmail, 'second@example.com')  // ignored
  .generate(schema)
// email will be 'first@example.com'
```

### Example Type Constructors

| Constructor | Target |
|--------------|------|
| `z.ZodString` | `z.string()` |
| `z.ZodNumber` | `z.number()` |
| `z.ZodBoolean` | `z.boolean()` |
| `z.ZodEmail` | `z.email()` |
| `z.ZodUUID` | `z.uuid()` |
| `z.ZodURL` | `z.url()` |
| `z.ZodDate` | `z.date()` |

## supplyRef - Match by Schema Reference

[▶ Try it in the Playground](/playground/?example=supply)

`supply` targets every schema of a given Zod class. When you need to pin only **one specific occurrence**, use `supplyRef` to compare by reference (`===`).

```ts
const Name = z.string()

const Schema = z.object({
  user: z.object({ name: Name }),  // <- this Name node
  bio: z.string(),                  // <- a different z.string()
})

const mock = initGenerator()
  .supplyRef(Name, 'Alice')
  .generate(Schema)
// mock.user.name === 'Alice'
// mock.bio is generated normally (different reference)
```

- The match is **identity-based**, so two `z.string()` calls produce two distinct references that do not match each other.
- When the same reference is supplied twice, the **first** registration wins, just like `supply`.

## supplyPath - Match by Structural Path

`supplyPath` pins a value at a specific **path inside the generated tree**, regardless of what Zod type is at that location. Path segments are `string | number | symbol`, plus two markers:

- `'$item'` — every element of an array / tuple / set
- `'$value'` — every value of a record / map

```ts
const Schema = z.object({
  user: z.object({ name: z.string(), createdAt: z.date() }),
  scores: z.record(z.string(), z.number()),
  pair: z.tuple([z.string(), z.string()]),
})

const mock = initGenerator()
  .supplyPath(['user', 'name'], 'Alice')              // object key
  .supplyPath(['user', 'createdAt'], new Date(0))     // typed value at a leaf
  .supplyPath(['scores', 'alice'], 100)               // inject a specific record key
  .supplyPath(['scores', '$value'], 0)                // fallback for other values
  .supplyPath(['pair', 0], 'first')                   // tuple index
  .generate(Schema)
```

### Path rules per container

| Container | `string` segment | `number` segment | `$item` | `$value` |
|---|---|---|---|---|
| `object` | property name | — | — | — |
| `array` | — | index (length is extended if needed) | all elements | — |
| `tuple` | — | fixed index | all elements | — |
| `record` | inject this key | inject numeric key | — | every value |
| `map` | inject this key | inject numeric key | — | every value |
| `set` | — | — | all members | — |

For records and maps, supplying a specific key **injects** that entry — the key is guaranteed to exist in the output even if it would not have been randomly generated. Random entries are still produced around it.

### Specific paths beat marker paths

When both apply, a literal path wins over `$item` / `$value`. Within the same specificity, the first registration wins.

```ts
const mock = initGenerator({ array: { min: 3, max: 3 } })
  .supplyPath(['$item'], 'default')
  .supplyPath([1], 'middle')
  .generate(z.array(z.string()))
// => ['default', 'middle', 'default']
```

### Why no `$key`?

`$key` (replace all keys with one value) is intentionally not supported: record/map keys must be unique, so "all keys = X" would collapse the collection to a single entry. Specific keys via literal segments cover the useful cases.

### Symbol segments

Symbols (`Symbol` references) are valid path segments for `z.record(z.symbol(), ...)` and `z.map(z.symbol(), ...)`.

```ts
const KEY = Symbol('user')
const Schema = z.map(z.symbol(), z.number())
const mock = initGenerator().supplyPath([KEY], 7).generate(Schema)
// mock.get(KEY) === 7
```

`Set` does not support per-element targeting (its members have no stable identity).

::: info supplyPath pierces wrappers
A path matches at a location regardless of wrapper schemas around it.
`supplyPath(['name'], 'X')` applies even when `name` is
`z.string().optional()` / `.nullable()` / `.default()` / `z.lazy(...)` —
the supplied value replaces the slot and the wrapper's probability logic
is bypassed. To intentionally produce `undefined`/`null`, supply that
value explicitly: `supplyPath(['name'], undefined)`.
:::

## override - Custom Generator Functions

Use `override` when you need more flexible customization than `supply`. You can define a function that takes a schema and options as arguments and returns a custom value.

```ts
import { type CustomGeneratorType, initGenerator } from 'zod-v4-mocks'
import { z } from 'zod'

const schema = z.object({
  name: z.string(),
  email: z.email(),
})

const customGenerator: CustomGeneratorType = (schema, options) => {
  const { faker } = options
  if (schema instanceof z.ZodString) {
    return 'custom: ' + faker.person.fullName()
  }
  // returning undefined falls back to the default generation logic
}

const mock = initGenerator()
  .override(customGenerator)
  .generate(schema)
```

### CustomGeneratorType Type Definition

```ts
type CustomGeneratorType = (
  schema: z.core.$ZodType,
  options: GeneraterOptions,
) => unknown | undefined
```

- **`schema`**: The Zod schema instance currently being processed
- **`options`**: Generation options (includes the `faker` instance)
- **Return value**: The value to generate. Returning `undefined` falls back to the default generation logic

### Schema Instance Comparison

In addition to `instanceof`, you can compare **schema references** directly for more fine-grained control.

```ts
const basicSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
})

const customGenerator: CustomGeneratorType = (schema, options) => {
  const { faker } = options
  // Only customize the name field (other z.string() instances are unaffected)
  if (schema instanceof z.ZodString && schema === basicSchema.shape.name) {
    return 'custom name: ' + faker.person.fullName()
  }
}
```

### Handling `z.custom()` and `z.instanceof()`

`z.custom()` schemas have no runtime hint about what to produce, so the library reads a generator from the schema's `meta`. The meta key is configurable via [`customMockKey`](/guide/configuration#custommockkey) and defaults to `'mock'`.

```ts
const FileSchema = z.custom<File>((v) => v instanceof File).meta({
  mock: (faker) => new File(['x'], faker.system.fileName()),
})

const BigDec = z.instanceof(BigDecimal).meta({
  mock: () => new BigDecimal('1.5'),
})

const mock = initGenerator().generate(z.object({ file: FileSchema, n: BigDec }))
```

The meta value can be either a function `(faker, options) => unknown` or a plain value.

When neither a meta `mock` nor a `supplyRef` is provided for a `z.custom` slot, the value is treated as **omitted** — it is silently dropped from arrays / objects / records / maps / sets and produces a warning in tuples (which cannot be shrunk).

You can also pin one-off values from a test via `supplyRef`, which takes precedence over the meta:

```ts
const mock = initGenerator()
  .supplyRef(FileSchema, new File(['fixed'], 'fixed.txt'))
  .generate(FileSchema)
```

## Priority of supply and override

When both `supply` and `override` are set for the same type, **the one set first takes priority**. If `supply` is set before `override`, then `supply` takes priority.

```ts
const customGenerator: CustomGeneratorType = (schema) => {
  if (schema instanceof z.ZodEmail) {
    return 'override@example.com'
  }
}

const mock = initGenerator()
  .supply(z.ZodEmail, 'supply@example.com')  // set first -> takes priority
  .override(customGenerator)                  // set second
  .generate(schema)
// email will be 'supply@example.com'
```

Internally, both `supply` and `override` are added to the same custom generator chain. The one added first is evaluated first, and the result is determined when a non-`undefined` value is returned.

### Full priority order

Across all customization methods:

1. **`supplyPath`** — matched paths win over everything else (most specific location).
2. **`consistentKey` registry** — if the schema is registered for consistent values.
3. **`supply` / `supplyRef` / `override`** — the unified custom generator chain (first registered wins).
4. **`keyMapping`** — opt-in property-name → faker mapping for primitive leaves.
5. **`z.custom().meta(...)`** — meta-driven generator for `z.custom` / `z.instanceof`.
6. **Default generation** — the library's built-in rules.

## Reproducible Custom Generators

To generate reproducible values in custom generators, use `options.faker` instead of `Math.random()`. The `faker` instance has a built-in seed-based random number generator (RNG).

```ts
const deterministicOverride: CustomGeneratorType = (schema, options) => {
  const { faker } = options // seeded RNG
  if (schema instanceof z.ZodEmail) {
    const user = faker.internet.userName()
    const host = faker.internet.domainName()
    return `${user}@${host}`
  }
}

const gen = initGenerator({ seed: 12345 })
  .override(deterministicOverride)

const a = gen.generate(z.email()) // same value every time with the same seed
```

::: warning Avoid functions that break reproducibility
The following functions ignore the seed value and will break test reproducibility:
- `Math.random()`
- `Date.now()`
- `crypto.randomUUID()`

Use `options.faker.number.int()`, `options.faker.date.recent()`, etc. instead.
:::

## register - Consistent Data Generation

Use `register` to share the same values across related fields. See [Configuration - consistentKey and register](/guide/configuration#consistentkey-and-register) for details.

```ts
const consistentKey = 'name'
const UserId = z.uuid().meta({ [consistentKey]: 'UserId' })

const userSchema = z.object({
  id: UserId,
  name: z.string(),
})

const commentSchema = z.object({
  userId: UserId, // the same value as userSchema.id is generated
  value: z.string(),
})

const mock = initGenerator({ consistentKey })
  .register([UserId])
  .generate(commentSchema)
```

## Practical Patterns

### Factory Functions for Testing

```ts
function createMockUser(overrides?: Partial<z.infer<typeof userSchema>>) {
  const generator = initGenerator({ seed: 1 })
  const base = generator.generate(userSchema)
  return { ...base, ...overrides }
}

// Usage
const user = createMockUser({ name: 'Test User' })
```

### Combining Multiple Overrides

```ts
const emailOverride: CustomGeneratorType = (schema, options) => {
  if (schema instanceof z.ZodEmail) {
    return `user${options.faker.number.int({ max: 999 })}@test.com`
  }
}

const dateOverride: CustomGeneratorType = (schema, options) => {
  if (schema instanceof z.ZodDate) {
    return options.faker.date.recent({ days: 30 })
  }
}

const mock = initGenerator({ seed: 42 })
  .override(emailOverride)
  .override(dateOverride)
  .generate(schema)
```

## Next Steps

- [Configuration](/guide/configuration) - All MockConfig options
- [Schema Support](/guide/schema-support) - Details on supported schemas
- [API Reference](/api/) - Detailed information on all methods
