# 生成

Zod スキーマからモックデータを作るメソッド群です。いずれもチェーン不可で、
[カスタマイズ](/ja/api/customization) のあとの終端ステップになります。

## generate

```ts
generate<T extends z.ZodType>(schema: T): z.infer<T>
```

スキーマからモックデータを1つ生成します。戻り値の型はスキーマの `z.infer<T>` に基づいて推論されます。

```ts
const schema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
})

const mock = generator.generate(schema)
// 型: { id: string; name: string; email: string }
```

::: info Branded 型
`z.string().brand<'UserId'>()` のような Branded 型も正しく推論されます。生成される値は内側のスキーマ（この場合 `string`）に従いますが、TypeScript 上の型にはブランドが含まれます。

```ts
const BrandedUserId = z.string().brand<'UserId'>()
const val = generator.generate(BrandedUserId)
// val の型は string & { __brand: 'UserId' }
```
:::

## multiGenerate

[▶ Playground で試す](/ja/playground/?example=multi-generate)

```ts
multiGenerate<T extends Record<string, z.ZodType>>(
  schemas: T
): { [K in keyof T]: z.infer<T[K]> }
```

複数のスキーマからモックデータを一度に生成します。キー名がそのまま結果のキーになります。

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

同じスキーマから独立したモックを `count` 件、配列で生成します。シード済みの乱数生成器
により、呼び出しごとに決定的かつ互いに異なる値が得られます。`count` は非負整数で
なければならず、それ以外はエラーになります。

```ts
const users = generator.generateMany(UserSchema, 10)
// 型: User[]（10 件）
```

CLI の `--count` フラグはこのメソッドを使っています。

## preflight

```ts
preflight(schema: z.core.$ZodType): PreflightDiagnostic[]
```

[プリフライトのスキーマウォーク](/ja/guide/configuration#preflightcheck)を実行し、その診断結果を**データとして**返します。例外を投げたりジェネレーターの状態を変更したりはしません。`generate()` 内部で動くチェック（error レベルでは例外を投げ、warning レベルではログ出力する）の読み取り専用版にあたり、すべての診断をそのまま返すので、生成前にスキーマを検査できます（ツール連携、Lint、[Playground](/ja/playground/) など）。`preflightCheck` を無効にしている場合は空配列を返します。

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

各 `PreflightDiagnostic` は `level`（`'error' | 'warning'`）、問題のあるノードへの `path`、人間が読める `message` を持ちます。

## factory

[▶ Playground で試す](/ja/playground/?example=factory)

```ts
factory<T extends z.ZodType>(
  schema: T
): { next: () => z.infer<T>; take: (n: number) => z.infer<T>[] }
```

スキーマに束縛したファクトリを返します。同じスキーマから繰り返し生成する場面
— フィクスチャを1行ずつ投入する、配列を一括で持たずに大量バッチをストリーム
する — に便利です。

- `next()` — 新しいモックを1つ生成（`generate(schema)` と同等）。
- `take(n)` — `n` 件のモックを配列で生成（`generateMany(schema, n)` と同等）。

```ts
const userFactory = generator.factory(UserSchema)

const first = userFactory.next()       // User
const batch = userFactory.take(100)    // User[]

// 配列を保持せずストリーム
for (let i = 0; i < 1000; i++) {
  await db.insert(userFactory.next())
}
```
