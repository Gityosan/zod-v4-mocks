# Configuration

You can customize mock generation behavior by passing an options object to `initGenerator()`.

## MockConfig

```ts
interface MockConfig {
  locale?: LocaleType | LocaleType[]  // default: [en, base]
  randomizer?: Randomizer             // faker.js randomizer
  seed: number                        // default: 1
  array: { min: number; max: number } // default: { min: 1, max: 3 }
  map: { min: number; max: number }   // default: { min: 1, max: 3 }
  set: { min: number; max: number }   // default: { min: 1, max: 3 }
  record: { min: number; max: number } // default: { min: 1, max: 3 }
  optionalProbability: number          // default: 0.5
  nullableProbability: number          // default: 0.5
  defaultProbability: number           // default: 0.5
  recursiveDepthLimit?: number         // default: 5
  consistentKey?: string               // metadata key name
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
