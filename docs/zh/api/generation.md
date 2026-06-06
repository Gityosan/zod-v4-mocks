# 生成

将 Zod Schema 转换为 Mock 数据的方法。这些方法都不可链式调用——它们是任何
[自定义](/zh/api/customization) 之后的终结步骤。

## generate

```ts
generate<T extends z.ZodType>(schema: T): z.infer<T>
```

从 Schema 生成一个 Mock 数据。返回值的类型基于 Schema 的 `z.infer<T>` 进行推断。

```ts
const schema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
})

const mock = generator.generate(schema)
// 类型: { id: string; name: string; email: string }
```

::: info Branded 类型
`z.string().brand<'UserId'>()` 这样的 Branded 类型也能正确推断。生成的值遵循内部 Schema（此处为 `string`），但 TypeScript 的类型会包含 brand。

```ts
const BrandedUserId = z.string().brand<'UserId'>()
const val = generator.generate(BrandedUserId)
// val 的类型为 string & { __brand: 'UserId' }
```
:::

## multiGenerate

[▶ 在 Playground 中试用](/zh/playground/?example=multi-generate)

```ts
multiGenerate<T extends Record<string, z.ZodType>>(
  schemas: T
): { [K in keyof T]: z.infer<T[K]> }
```

从多个 Schema 一次性生成 Mock 数据。键名直接成为结果的键。

```ts
const mocks = generator.multiGenerate({
  user: z.object({ id: z.uuid(), name: z.string() }),
  post: z.object({ id: z.number().int(), title: z.string() }),
})

console.log(mocks.user) // { id: "...", name: "..." }
console.log(mocks.post) // { id: 123, title: "..." }
```

## generateMany

[▶ 在 Playground 中试用](/zh/playground/?example=discriminated-union)

```ts
generateMany<T extends z.ZodType>(schema: T, count: number): z.infer<T>[]
```

从同一个 Schema 生成包含 `count` 个相互独立 Mock 的数组。带 seed 的随机数生成器在每次调用时产生确定但互不相同的值。`count`
必须为非负整数——否则会抛出错误。

```ts
const users = generator.generateMany(UserSchema, 10)
// 类型: User[]（10 个元素）
```

这正是 CLI 的 `--count` 标志背后所使用的方法。

## preflight

```ts
preflight(schema: z.core.$ZodType): PreflightDiagnostic[]
```

运行[预检 schema 遍历](/zh/guide/configuration#preflightcheck)并将其诊断结果**以数据形式**返回，既不会抛出异常，也不会改变生成器状态。它是 `generate()` 内部所运行检查的只读版本——后者在 error 级别会抛出异常、在 warning 级别会打印日志，而 `preflight()` 会把每一条诊断都原样返回，便于你在生成前检查 schema（用于工具集成、Lint、[Playground](/zh/playground/) 等）。当 `preflightCheck` 被禁用时返回空数组。

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

每个 `PreflightDiagnostic` 都包含 `level`（`'error' | 'warning'`）、指向问题节点的 `path`，以及可读的 `message`。

## factory

[▶ 在 Playground 中试用](/zh/playground/?example=factory)

```ts
factory<T extends z.ZodType>(
  schema: T
): { next: () => z.infer<T>; take: (n: number) => z.infer<T>[] }
```

返回一个绑定到某个 Schema 的工厂。当你需要从同一个 Schema 反复生成时很有用——例如逐行填充测试数据，或在不预先构建整个数组的情况下流式生成大批量数据。

- `next()` —— 生成一个新的 Mock（等价于 `generate(schema)`）。
- `take(n)` —— 生成包含 `n` 个 Mock 的数组（等价于 `generateMany(schema, n)`）。

```ts
const userFactory = generator.factory(UserSchema)

const first = userFactory.next()       // User
const batch = userFactory.take(100)    // User[]

// 无需持有整个数组即可流式处理
for (let i = 0; i < 1000; i++) {
  await db.insert(userFactory.next())
}
```
