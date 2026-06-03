# Generation

Methods that turn a Zod schema into mock data. None of these are chainable —
they are the terminal step after any [customization](/api/customization).

## generate

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

## multiGenerate

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

## generateMany

```ts
generateMany<T extends z.ZodType>(schema: T, count: number): z.infer<T>[]
```

Generates an array of `count` independent mocks from the same schema. The
seeded RNG produces deterministic but distinct values on each call. `count`
must be a non-negative integer — otherwise an error is thrown.

```ts
const users = generator.generateMany(UserSchema, 10)
// Type: User[] (10 items)
```

This is the method behind the CLI's `--count` flag.

## preflight

```ts
preflight(schema: z.core.$ZodType): PreflightDiagnostic[]
```

Runs the [pre-flight schema walk](/guide/configuration#preflightcheck) and
returns its diagnostics **as data**, without throwing or mutating the
generator. This is the read-only counterpart to the check that runs inside
`generate()` — that one throws on error-level diagnostics and logs
warning-level ones, whereas `preflight()` hands every diagnostic back so you
can inspect a schema up front (tooling, linting, the
[playground](/playground/)). Returns an empty array when `preflightCheck` is
disabled.

```ts
const schema = z.object({
  username: z.string().refine((s) => s.startsWith('@')),
  score: z.number().min(100).max(10),
})

const diagnostics = generator.preflight(schema)
// [
//   { level: 'warning', path: 'username', message: 'A .refine() ... is ignored ...' },
//   { level: 'warning', path: 'score',    message: 'Unsatisfiable number range ...' },
// ]
```

Each `PreflightDiagnostic` has a `level` (`'error' | 'warning'`), the `path`
to the offending node, and a human-readable `message`.

## factory

```ts
factory<T extends z.ZodType>(
  schema: T
): { next: () => z.infer<T>; take: (n: number) => z.infer<T>[] }
```

Returns a factory bound to a schema. Useful when you generate from the same
schema repeatedly — for example seeding a fixture row-by-row, or streaming a
large batch without building the whole array up front.

- `next()` — produces one fresh mock (equivalent to `generate(schema)`).
- `take(n)` — produces an array of `n` mocks (equivalent to `generateMany(schema, n)`).

```ts
const userFactory = generator.factory(UserSchema)

const first = userFactory.next()       // User
const batch = userFactory.take(100)    // User[]

// Stream without holding the whole array
for (let i = 0; i < 1000; i++) {
  await db.insert(userFactory.next())
}
```
