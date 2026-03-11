# Custom Generator

You can set custom values or generator functions for specific schemas. There are three methods available -- `supply`, `override`, and `register` -- each designed for different use cases.

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

### Handling Unsupported Schemas

For schemas not supported by the library, such as `z.custom()` or `z.instanceof()`, you can provide values via `override`.

```ts
const myCustomSchema = z.custom<MyClass>((val) => val instanceof MyClass)

const customGenerator: CustomGeneratorType = (schema) => {
  if (schema === myCustomSchema) {
    return new MyClass()
  }
}

const mock = initGenerator()
  .override(customGenerator)
  .generate(myCustomSchema)
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
