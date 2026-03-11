# カスタムジェネレータ

特定のスキーマに対してカスタム値やジェネレータ関数を設定できます。`supply`、`override`、`register` の3つの方法があり、それぞれ異なるユースケースに対応しています。

## supply - 固定値の設定

特定のZod型クラスに**固定値**を割り当てます。「このスキーマ型には常にこの値を使う」というシンプルなケースに最適です。

```ts
import { z } from 'zod'
import { initGenerator } from 'zod-v4-mocks'

const schema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
})

const mock = initGenerator()
  .supply(z.ZodString, 'テストユーザー')
  .supply(z.ZodEmail, 'test@example.com')
  .generate(schema)

// => { id: "08e93b6a-...", name: "テストユーザー", email: "test@example.com" }
```

### supply の特徴

- Zod型のコンストラクタを指定して、その型すべてに同じ値を設定
- メソッドチェーンで複数の `supply` を連結可能
- 同じ型に複数の値を設定した場合、**最初に設定した値が優先**

```ts
const mock = initGenerator()
  .supply(z.ZodEmail, 'first@example.com')   // こちらが優先
  .supply(z.ZodEmail, 'second@example.com')  // 無視される
  .generate(schema)
// email は 'first@example.com' になる
```

### 対応する型コンストラクタの例

| コンストラクタ | 対象 |
|--------------|------|
| `z.ZodString` | `z.string()` |
| `z.ZodNumber` | `z.number()` |
| `z.ZodBoolean` | `z.boolean()` |
| `z.ZodEmail` | `z.email()` |
| `z.ZodUUID` | `z.uuid()` |
| `z.ZodURL` | `z.url()` |
| `z.ZodDate` | `z.date()` |

## override - カスタムジェネレータ関数

`supply` よりも柔軟なカスタマイズが必要な場合に `override` を使用します。スキーマとオプションを引数に受け取り、カスタム値を返す関数を定義できます。

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
  // undefined を返すとデフォルトの生成ロジックが使用される
}

const mock = initGenerator()
  .override(customGenerator)
  .generate(schema)
```

### CustomGeneratorType の型定義

```ts
type CustomGeneratorType = (
  schema: z.core.$ZodType,
  options: GeneraterOptions,
) => unknown | undefined
```

- **`schema`**: 現在処理中のZodスキーマインスタンス
- **`options`**: 生成オプション（`faker` インスタンスを含む）
- **戻り値**: 生成する値。`undefined` を返すとデフォルトの生成ロジックにフォールバック

### スキーマインスタンスの比較

`instanceof` だけでなく、**スキーマの参照**を直接比較することで、より細かい制御が可能です。

```ts
const basicSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
})

const customGenerator: CustomGeneratorType = (schema, options) => {
  const { faker } = options
  // name フィールドだけをカスタマイズ（他の z.string() は影響を受けない）
  if (schema instanceof z.ZodString && schema === basicSchema.shape.name) {
    return 'custom name: ' + faker.person.fullName()
  }
}
```

### 非対応スキーマへの対応

`z.custom()` や `z.instanceof()` のようにライブラリが対応していないスキーマには、`override` で値を提供できます。

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

## supply と override の優先順位

同じ型に対して `supply` と `override` の両方が設定されている場合、**先に設定した方が優先**されます。`supply` → `override` の順に設定すると `supply` が優先されます。

```ts
const customGenerator: CustomGeneratorType = (schema) => {
  if (schema instanceof z.ZodEmail) {
    return 'override@example.com'
  }
}

const mock = initGenerator()
  .supply(z.ZodEmail, 'supply@example.com')  // 先に設定 → 優先
  .override(customGenerator)                  // 後に設定
  .generate(schema)
// email は 'supply@example.com' になる
```

内部的には、`supply` も `override` も同じカスタムジェネレータチェーンに追加されます。先に追加されたものが先に評価され、`undefined` 以外を返した時点で確定します。

## 再現性のあるカスタムジェネレータ

カスタムジェネレータでも再現性のある値を生成するには、`Math.random()` ではなく `options.faker` を使用してください。`faker` インスタンスは seed に基づいた乱数生成器（RNG）を内蔵しています。

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

const a = gen.generate(z.email()) // 同じ seed なら毎回同じ値
```

::: warning 再現性を損なう関数を避ける
以下のような関数はシード値を無視するため、テストの再現性が失われます:
- `Math.random()`
- `Date.now()`
- `crypto.randomUUID()`

代わりに `options.faker.number.int()`, `options.faker.date.recent()` 等を使用してください。
:::

## register - 一貫したデータ生成

関連するフィールド間で同じ値を共有するには、`register` を使用します。詳しくは[設定 - consistentKey と register](/ja/guide/configuration#consistentkey-と-register) を参照してください。

```ts
const consistentKey = 'name'
const UserId = z.uuid().meta({ [consistentKey]: 'UserId' })

const userSchema = z.object({
  id: UserId,
  name: z.string(),
})

const commentSchema = z.object({
  userId: UserId, // userSchema.id と同じ値が生成される
  value: z.string(),
})

const mock = initGenerator({ consistentKey })
  .register([UserId])
  .generate(commentSchema)
```

## 実践的なパターン

### テスト用のファクトリ関数

```ts
function createMockUser(overrides?: Partial<z.infer<typeof userSchema>>) {
  const generator = initGenerator({ seed: 1 })
  const base = generator.generate(userSchema)
  return { ...base, ...overrides }
}

// 使用例
const user = createMockUser({ name: 'テストユーザー' })
```

### 複数のオーバーライドを組み合わせる

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

## 次のステップ

- [設定](/ja/guide/configuration) - MockConfig の全オプション
- [スキーマ対応状況](/ja/guide/schema-support) - 対応スキーマの詳細
- [API リファレンス](/ja/api/) - 全メソッドの詳細
