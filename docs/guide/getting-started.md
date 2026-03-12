# Getting Started

## What is zod-v4-mocks?

A library that automatically generates mock data from Zod v4 schemas. It instantly generates realistic dummy data from schema definitions for testing, development, and prototyping.

Internally, it uses [@faker-js/faker](https://fakerjs.dev/) to generate data that conforms to formats such as email addresses, URLs, UUIDs, and more.

::: tip If you're using Zod v3 (v4 preview)
If you're using `zod@3.25.76` with `import from 'zod/v4'`, please use [zod-v4-preview-mocks](https://www.npmjs.com/package/zod-v4-preview-mocks) instead.
:::

::: warning v2.0.0–v2.0.4 Compatibility Issue
v2.0.0–v2.0.4 had compatibility issues with Zod versions older than v4.3.5 (crashes due to missing classes: `ZodMAC`, `ZodCodec`, `ZodXor`, `ZodExactOptional`). If you use Zod v4.0.0–v4.3.4, please upgrade to **v2.1.0+**.
:::

## Installation

::: code-group
```bash [npm]
npm install zod-v4-mocks
```
```bash [pnpm]
pnpm add zod-v4-mocks
```
```bash [yarn]
yarn add zod-v4-mocks
```
:::

**Requirements**: Zod v4.0.0 or higher, Node.js 18 or higher

## Basic Usage

```ts
import { z } from 'zod'
import { initGenerator } from 'zod-v4-mocks'

const schema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
  age: z.number().min(18).max(120).optional(),
  isActive: z.boolean(),
  tags: z.array(z.string()),
  createdAt: z.date(),
})

const generator = initGenerator({ seed: 1 })
const mockUser = generator.generate(schema)
console.log(mockUser)
// => { id: "08e93b6a-...", name: "subito", email: "Dion59@gmail.com", ... }
```

Generated values will generally pass the schema's validation:

```ts
schema.parse(mockUser) // OK - validation passes
```

## Generating Multiple Mocks at Once

Use `multiGenerate` to generate mock data from multiple schemas at once.

```ts
const userSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
})

const postSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  body: z.string(),
  published: z.boolean(),
})

const generator = initGenerator({ seed: 1 })
const mocks = generator.multiGenerate({
  user: userSchema,
  post: postSchema,
})

console.log(mocks.user) // { id: "...", name: "...", email: "..." }
console.log(mocks.post) // { id: 123, title: "...", body: "...", published: true }
```

## Reproducible Generation

By specifying the same `seed` value, the same mock data is generated every time. This is useful for test stability.

```ts
const gen1 = initGenerator({ seed: 42 })
const gen2 = initGenerator({ seed: 42 })

const schema = z.string()
gen1.generate(schema) === gen2.generate(schema) // true
```

::: tip Tips for maintaining reproducibility
When defining custom generators with `override`, use `options.faker` instead of `Math.random()` or `Date.now()`. The `faker` instance uses a seed-based RNG.
:::

## Complex Schemas

Complex schemas including nested objects, arrays, records, unions, and more are supported.

```ts
const complexSchema = z.object({
  user: z.object({
    profile: z.object({
      name: z.string(),
      bio: z.string().optional(),
    }),
    preferences: z.object({
      theme: z.enum(['light', 'dark', 'auto']),
      notifications: z.boolean().default(true),
    }),
  }),
  posts: z.array(
    z.object({
      title: z.string(),
      content: z.string(),
      publishedAt: z.date().nullable(),
      tags: z.array(z.string()),
    }),
  ),
  metadata: z.record(
    z.string(),
    z.union([z.string(), z.number(), z.boolean()]),
  ),
})

const mock = initGenerator().generate(complexSchema)
```

## Supported Schemas

### Fully Supported

| Category | Schemas |
|---------|---------|
| **Primitives** | string, number, boolean, bigint, date, null, undefined, void, any, unknown, NaN, symbol |
| **String Formats** | email, URL, UUID (v1-v8), GUID, NanoID, ULID, CUID, CUID2, XID, KSUID, JWT, emoji, IPv4, IPv6, CIDRv4, CIDRv6, Base64, Base64URL, E164, hostname, datetime, isodate, isotime, isoduration |
| **Collections** | object, array, tuple, record, map, set |
| **Composite Types** | union, discriminatedUnion, intersection (same type), xor |
| **Modifiers** | optional, exactOptional, nullable, nonoptional, readonly, default, prefault |
| **Others** | enum, literal, templateLiteral, lazy, pipe, codec, catch, success, file |

### Partially Supported

| Schema | Notes |
|---------|--------|
| `z.lazy()` | Depth limited (default 5 levels). Possible errors with top-level `union` |
| `z.intersection()` | Same-type intersections are supported. Different-type intersections are generally unsupported (object+record and array+tuple are exceptions) |
| `.refine()` | Validation conditions are ignored |
| `.check()` | Only `z.overwrite()` / `z.trim()` are supported. `z.regex()` / `z.minLength()` etc. are unsupported (method-style `.regex()` is supported) |

### Unsupported

| Schema | Reason |
|---------|------|
| `z.custom()` / `z.instanceof()` | Cannot analyze custom validations. Use `override` as a workaround |
| `z.function()` | Generating function mocks is complex |
| `.catchall()` | Ignored (no impact on mock generation) |
| `z.nativeEnum()` | Deprecated in Zod v4. Use `z.enum()` instead |

## Next Steps

- [Configuration](/guide/configuration) - All MockConfig options
- [Custom Generator](/guide/custom-generator) - How to use supply / override / register
- [API Reference](/api/) - Detailed information on all methods
- [Playground](/playground/) - Try it in your browser
