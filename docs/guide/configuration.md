# Configuration

You can customize mock generation behavior by passing an options object to `initGenerator()`.

## MockConfig

```ts
interface MockConfig {
  locale?: LocaleType | LocaleType[]   // default: [en, base]
  randomizer?: Randomizer              // faker.js randomizer
  seed: number                         // default: 1
  array: { min: number; max: number }  // default: { min: 1, max: 3 }
  map: { min: number; max: number }    // default: { min: 1, max: 3 }
  set: { min: number; max: number }    // default: { min: 1, max: 3 }
  record: { min: number; max: number } // default: { min: 1, max: 3 }
  optionalProbability: number          // default: 0.5
  nullableProbability: number          // default: 0.5
  defaultProbability: number           // default: 0.5
  recursiveDepthLimit?: number         // default: 5
  consistentKey?: string               // metadata key name (consistent values)
  customMockKey?: string               // default: 'mock' (z.custom meta key)
  keyMapping?: 'off' | 'auto' | KeyMapper // default: 'off'
  preflightCheck?: boolean              // default: true
}
```

## Basic Configuration Example

```ts
import { z } from 'zod'
import { initGenerator } from 'zod-v4-mocks'

const generator = initGenerator({
  seed: 42,
  array: { min: 2, max: 5 },
  locale: 'ja',
})

const schema = z.object({
  name: z.string(),
  tags: z.array(z.string()),
})

const mock = generator.generate(schema)
// tags will have 2 to 5 elements
```

## seed

Specifying a `seed` generates reproducible mock data. Using the same seed value produces the same result every time, which is useful for ensuring test stability.

```ts
const gen1 = initGenerator({ seed: 42 })
const gen2 = initGenerator({ seed: 42 })

const schema = z.string()
gen1.generate(schema) === gen2.generate(schema) // true
```

Reproducibility is guaranteed for all supported schemas, including those with transforms or regex patterns.

```ts
const schema = z.string().transform((val) => val.toUpperCase())

const g1 = initGenerator({ seed: 444 })
const g2 = initGenerator({ seed: 444 })

const results1 = Array.from({ length: 3 }, () => g1.generate(schema))
const results2 = Array.from({ length: 3 }, () => g2.generate(schema))
// results1 and results2 are identical
```

::: tip Tips for maintaining reproducibility
When using custom generators (`override`), use `options.faker` instead of `Math.random()` or `Date.now()`. The `faker` instance uses a seed-based RNG.
:::

## locale

Specifies the faker.js locale. You can specify a single string or an array of multiple locales in priority order.

```ts
// Japanese locale
const generator = initGenerator({ locale: 'ja' })

// Multiple locales (in priority order)
const generator = initGenerator({ locale: ['ja', 'en'] })
```

The default is `[en, base]` (faker.js default). Changing the locale will generate names in the corresponding language when using functions like `faker.person.fullName()`.

## Collection Size Control

Control the number of generated elements for `array`, `map`, `set`, and `record` using `min`/`max`.

```ts
const generator = initGenerator({
  array: { min: 2, max: 5 },   // array length: 2-5
  record: { min: 1, max: 3 },  // record entries: 1-3
  map: { min: 2, max: 4 },     // Map entries: 2-4
  set: { min: 1, max: 3 },     // Set elements: 1-3
})
```

::: info Priority with schema-level constraints
When `.min()` / `.max()` / `.nonempty()` is set on the schema, the schema-level constraints take priority.

```ts
const gen = initGenerator({ array: { min: 1, max: 2 } })
const schema = z.array(z.string()).min(5) // schema's min(5) takes priority
const result = gen.generate(schema)
// result.length >= 5 is guaranteed
```
:::

## Probability Control

Controls the probability of values generated for Optional / Nullable / Default types. Values are specified in the range `0` (0%) to `1` (100%).

### optionalProbability

The probability that an `optional` type **will be omitted (become `undefined`)**.

```ts
// 30% chance of being undefined
const gen = initGenerator({ optionalProbability: 0.3 })

// Always generates a value (never undefined)
const gen = initGenerator({ optionalProbability: 0 })

// Always undefined
const gen = initGenerator({ optionalProbability: 1 })
```

### nullableProbability

The probability that a `nullable` type **generates `null`**.

```ts
// 30% chance of being null
const gen = initGenerator({ nullableProbability: 0.3 })
```

### defaultProbability

The probability that a `default` type **uses the default value**.

```ts
const gen = initGenerator({ defaultProbability: 0.8 })

const schema = z.boolean().default(true)
// 80% chance of true (default value), 20% chance of a random boolean
```

## recursiveDepthLimit

The maximum depth for recursive schemas (`z.lazy()` and getter-based circular references). The default is `5`.

```ts
const generator = initGenerator({ recursiveDepthLimit: 3 })
```

When the depth limit is reached, an empty object `{}` is returned as a terminator.

```ts
type Category = {
  name: string
  subcategories: Category[]
}

const categorySchema: z.ZodType<Category> = z.lazy(() =>
  z.object({
    name: z.string(),
    subcategories: z.array(categorySchema),
  }),
)

const gen = initGenerator({ recursiveDepthLimit: 2 })
const result = gen.generate(categorySchema)
// => { name: "...", subcategories: [{ name: "...", subcategories: [{}] }] }
//                                                        ^ empty object due to depth limit
```

Getter-based circular references work the same way.

```ts
const Node = z.object({
  value: z.number(),
  get next() {
    return Node.optional()
  },
})

const gen = initGenerator({ recursiveDepthLimit: 3 })
const result = gen.generate(Node) // completes normally
```

::: info lazyDepthLimit (deprecated)
`lazyDepthLimit` has the same functionality as `recursiveDepthLimit`. If `recursiveDepthLimit` is set, it takes priority. Use `recursiveDepthLimit` in new code.
:::

## consistentKey and register

Used to generate **consistent values** across related fields. For example, this is useful when you want to assign the same UUID to `User.id` and `Comment.userId`.

### How It Works

1. Set a metadata key on shared schemas using `.meta()`
2. Specify `consistentKey` in `initGenerator`
3. Register schemas with `.register()`
4. Consistent values are generated wherever registered schemas are used

### Practical Example

```ts
import { z } from 'zod'
import { initGenerator } from 'zod-v4-mocks'

// Set the metadata key name
const consistentKey = 'name'
const UserId = z.uuid().meta({ [consistentKey]: 'UserId' })
const CommentId = z.uuid().meta({ [consistentKey]: 'CommentId' })
const PostId = z.uuid().meta({ [consistentKey]: 'PostId' })

// Schema definitions
const userSchema = z.object({
  id: UserId,       // <- the same UserId is generated
  name: z.string(),
})

const commentSchema = z.object({
  id: CommentId,
  postId: PostId,   // <- the same PostId is generated
  user: userSchema,
  userId: UserId,   // <- same value as userSchema.id
  value: z.string(),
})

const postSchema = z.object({
  id: PostId,       // <- same value as commentSchema.postId
  comments: z.array(commentSchema),
  value: z.string(),
})

// Register schemas and generate
const schemas = [CommentId, UserId, PostId]
const mock = initGenerator({ consistentKey })
  .register(schemas)
  .generate(z.array(postSchema))
```

In the example above, the following consistency is guaranteed:

- Each Post's `id` matches the `postId` of Comments within that Post
- Each User's `id` matches `userId`

```json
[
  {
    "id": "08e93b6a-0a0b-4718-81af-c91ba0c86c67",
    "comments": [
      {
        "id": "b438b6fa-765b-4706-8b22-88adb9b5534a",
        "postId": "08e93b6a-0a0b-4718-81af-c91ba0c86c67",
        "user": {
          "id": "c9b26358-a125-4ad8-ad65-52d58980fe34",
          "name": "acceptus"
        },
        "userId": "c9b26358-a125-4ad8-ad65-52d58980fe34",
        "value": "antepono"
      }
    ],
    "value": "ut"
  }
]
```

## customMockKey

Meta attribute name read from `z.custom()` / `z.instanceof()` schemas to find a mock generator. Default `'mock'`.

```ts
const Schema = z.custom<File>().meta({ mock: (faker) => new File(['x'], faker.system.fileName()) })

initGenerator().generate(Schema) // calls meta.mock
```

To avoid name conflicts with other meta consumers, override the key:

```ts
const Schema = z.custom<File>().meta({ zodMock: () => new File([], 'a') })
initGenerator({ customMockKey: 'zodMock' }).generate(Schema)
```

See [Custom Generator — Handling `z.custom()`](/guide/custom-generator#handling-z-custom-and-z-instanceof) for full usage.

## keyMapping

Opt-in mapping from a property name to a `faker` function for primitive leaf schemas (string / number / boolean / date). Default `'off'`.

- `'off'` — no mapping (default behaviour).
- `'auto'` — use built-in defaults (`firstName`, `email`, `age`, `createdAt`, ...).
- `KeyMapper` function — `(key, schema, faker, options) => value | undefined`. Returning `undefined` falls back to the built-in defaults.

```ts
const Schema = z.object({
  firstName: z.string(),
  email: z.string(),
  age: z.number(),
  createdAt: z.date(),
})

initGenerator({ keyMapping: 'auto' }).generate(Schema)
// => { firstName: 'Hannah', email: 'a@x', age: 37, createdAt: <Date> }
```

`keyMapping` runs **after** `supplyPath` and the `supply` / `supplyRef` / `override` chain, so explicit overrides always win.

```ts
initGenerator({ keyMapping: 'auto' })
  .supplyPath(['email'], 'override@x')
  .generate(Schema)
// email is 'override@x', not a faker email
```

Built-in coverage includes (case-insensitive, separator-insensitive — `firstName`, `first_name`, `FIRST-NAME` all match):

| Key | Maps to |
|---|---|
| `firstName` / `lastName` / `name` | `faker.person.*` |
| `email`, `phone`, `url`, `avatar` | `faker.internet.*` |
| `street` / `city` / `country` / `zip` | `faker.location.*` |
| `company`, `jobTitle`, `department` | `faker.company.*`, `faker.person.jobTitle()` |
| `description`, `title`, `content` | `faker.lorem.*` |
| `age`, `price`, `quantity`, `rating`, `latitude`, `longitude` | sensible `faker.number.*` ranges |
| `createdAt`, `updatedAt`, `birthDate` | `faker.date.*` |

For a custom matcher:

```ts
import type { KeyMapper } from 'zod-v4-mocks'

const myMap: KeyMapper = (key, schema, faker) => {
  if (key === 'sku') return faker.string.alphanumeric(10).toUpperCase()
  return undefined // fall back to the built-in defaults
}

initGenerator({ keyMapping: myMap }).generate(z.object({ sku: z.string() }))
```

## preflightCheck

[▶ Try it in the Playground](/playground/?example=preflight)

Before generation, the library runs a pre-flight walk over the schema.
Default `true`. It catches constructs the generator cannot safely mock —
failing fast with the offending path, or auto-fixing where a minimal
correction exists. Disable with `initGenerator({ preflightCheck: false })`.

### Error-level checks (throw before generation)

- **z.custom() at a tuple position** — an un-mocked `z.custom()` /
  `z.instanceof()` in a fixed-length tuple. A tuple cannot drop a slot, so
  the un-mocked value would be invalid. Fix with `.meta({ mock: ... })` or
  `supplyRef()`.
- **Incompatible z.intersection()** — sides that no single value can
  satisfy: different primitive types (`z.string()` & `z.number()`), enums
  with no common value, or numbers with a disjoint range.
- **Invalid z.record() key type** — a key type that cannot produce a
  string / number / symbol.

```ts
const Schema = z.object({
  pair: z.tuple([z.string(), z.custom<File>()]),
})
initGenerator().generate(Schema)
// throws: Preflight check found 1 issue(s):
//   - pair[1]: z.custom()/z.instanceof() sits at a tuple position ...
```

When a `supply` or `override` is registered the library cannot verify
coverage, so error-level findings are downgraded to warnings.

### Warning-level checks (reported; generation continues)

- **Ignored .refine() / .superRefine()** — refinement predicates are
  dropped during generation, so the generated value may not satisfy them.
  Pin a valid value with `supplyPath()` / `supplyRef()` if the mock must
  pass `.parse()`.
- **Unsatisfiable number / bigint range** — `min` greater than `max`
  (e.g. `z.number().min(10).max(5)`). The generator clamps the range; the
  value will not pass `.parse()`.
- **Conflicting z.string() checks** — multiple competing checks of the
  same kind (`regex`, `length`, `startsWith`, `endsWith`,
  `toUpperCase`/`toLowerCase`); only the last of each kind is applied.
- **Unsupported schema type** — a schema the generator does not handle
  (`z.function()`, `z.promise()`, or a type added by a newer Zod).
- **Recursive z.lazy() as its own anchor** — auto-fixed (see below).

### Auto-fixes

For a problem with a safe, minimal schema correction, preflight emits a
**warning** and applies the fix automatically — generation then proceeds
with the corrected schema, no code change required.

Currently this covers a recursive `z.lazy()` that is its own recursion
anchor. The depth limiter tracks object/array/etc. references, not
`z.lazy()`, so such a schema would otherwise stack-overflow:

```ts
// detected, warned, and auto-fixed — generation terminates normally
const Tree = z.lazy(() =>
  z.object({ value: z.string(), children: z.array(Tree) }),
)
initGenerator().generate(Tree)
// [preflight] (root): A recursive z.lazy() is its own recursion anchor ...
```

The warning still suggests the cleaner hand-written form
(`z.object({ ..., children: z.lazy(() => z.array(Tree)) })`). Auto-fixes
are skipped when `preflightCheck` is `false`.

::: tip
The pre-flight pass is also a forward-compatibility net: as Zod adds new
schema types, cases the generator cannot yet handle can be surfaced here —
either rejected with an error or auto-fixed with a warning — rather than
failing deep inside generation.
:::

## updateConfig

Configuration can also be changed later using `updateConfig()`.

```ts
const generator = initGenerator({ seed: 1 })
generator.generate(z.string()) // generated with seed: 1

generator.updateConfig({ seed: 42, array: { min: 5, max: 10 } })
generator.generate(z.string()) // generated with seed: 42
```

`updateConfig` updates only the config while preserving existing `supply` / `override` settings.

## Next Steps

- [Custom Generator](/guide/custom-generator) - How to use supply / override / register
- [Schema Support](/guide/schema-support) - Details on supported schemas
- [API Reference](/api/) - Detailed information on all methods
