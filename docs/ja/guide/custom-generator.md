# カスタムジェネレータ

特定のスキーマに対してカスタム値やジェネレータ関数を設定できます。`supply` / `supplyRef` / `supplyPath` / `override` / `register` の5つの方法があり、それぞれ異なる粒度の制御に対応しています。

| メソッド | 対象 | 使いどころ |
|---|---|---|
| `supply` | Zod の*コンストラクタ*（`z.ZodString` 等） | 「すべての string を X に」 |
| `supplyRef` | 特定の*スキーマ参照* | 「この個別のサブスキーマを X に」 |
| `supplyPath` | 生成ツリー内の*パス* | 「`user.email` のスロットを X に」 |
| `override` | 任意の*関数*（schema + context） | 「コードで表現できることならなんでも」 |
| `register` | 整合性をとる関連スキーマ | 「`User.id` と `Comment.userId` で同じ UUID」 |

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

## supplyRef - スキーマ参照で一致

[▶ Playground で試す](/ja/playground/?example=supply)

`supply` は同じ Zod クラスのスキーマすべてに当たります。**特定の1箇所だけ**固定したい場合は、参照（`===`）で一致する `supplyRef` を使います。

```ts
const Name = z.string()

const Schema = z.object({
  user: z.object({ name: Name }),  // <- この Name ノード
  bio: z.string(),                  // <- 別の z.string()
})

const mock = initGenerator()
  .supplyRef(Name, 'Alice')
  .generate(Schema)
// mock.user.name === 'Alice'
// mock.bio は通常生成（別の参照なので無関係）
```

- 一致は**インスタンス同一性**ベース。`z.string()` を2回呼び出すと別参照になり、互いに一致しません。
- 同じ参照を2回 supply した場合、`supply` と同様に**最初の登録が優先**されます。

## supplyPath - 構造パスで一致

`supplyPath` は生成ツリーの**特定パス**に値を固定します。そのパスの Zod 型に関係なく当たります。パスは `string | number | symbol` のセグメントと、2つのマーカーで構成されます。

- `'$item'` — 配列・タプル・Set のすべての要素
- `'$value'` — レコード・Map のすべての値

```ts
const Schema = z.object({
  user: z.object({ name: z.string(), createdAt: z.date() }),
  scores: z.record(z.string(), z.number()),
  pair: z.tuple([z.string(), z.string()]),
})

const mock = initGenerator()
  .supplyPath(['user', 'name'], 'Alice')              // object のキー
  .supplyPath(['user', 'createdAt'], new Date(0))     // 型付きの葉
  .supplyPath(['scores', 'alice'], 100)               // record の特定キーを注入
  .supplyPath(['scores', '$value'], 0)                // それ以外の値のデフォルト
  .supplyPath(['pair', 0], 'first')                   // tuple の index
  .generate(Schema)
```

### コンテナ別のルール

| コンテナ | `string` セグメント | `number` セグメント | `$item` | `$value` |
|---|---|---|---|---|
| `object` | プロパティ名 | — | — | — |
| `array` | — | index（必要なら配列長を拡張） | 全要素 | — |
| `tuple` | — | 固定 index | 全要素 | — |
| `record` | この鍵を注入 | 数値鍵を注入 | — | 全値 |
| `map` | この鍵を注入 | 数値鍵を注入 | — | 全値 |
| `set` | — | — | 全要素 | — |

record / map では、特定鍵を指定すると**そのエントリが必ず存在**するように注入されます。残りはランダムに生成されます。

### 具体パスはマーカーに勝つ

両方が当たる場合、リテラルパスが `$item` / `$value` に勝ちます。同じ specificity 内では最初の登録が勝ちます。

```ts
const mock = initGenerator({ array: { min: 3, max: 3 } })
  .supplyPath(['$item'], 'default')
  .supplyPath([1], 'middle')
  .generate(z.array(z.string()))
// => ['default', 'middle', 'default']
```

### `$key` が無い理由

「すべてのキーを X に」という `$key` は意図的に未サポートです。record / map の鍵は一意制約があるため、全鍵を同じ値にするとコレクションが1エントリに縮約されます。リテラルセグメントで特定鍵を指定するパターンが現実的なユースケースを覆えます。

### Symbol セグメント

`Symbol` 参照は `z.record(z.symbol(), ...)` や `z.map(z.symbol(), ...)` のパスセグメントとして有効です。

```ts
const KEY = Symbol('user')
const Schema = z.map(z.symbol(), z.number())
const mock = initGenerator().supplyPath([KEY], 7).generate(Schema)
// mock.get(KEY) === 7
```

`Set` は要素単位の指定をサポートしません（メンバーに安定した identity がないため）。

::: info supplyPath はラッパーを貫通する
パスは、その位置を囲むラッパースキーマに関係なく一致します。
`supplyPath(['name'], 'X')` は `name` が `z.string().optional()` /
`.nullable()` / `.default()` / `z.lazy(...)` であっても適用され、
供給値がスロットを置き換え、ラッパーの確率ロジックはバイパスされます。
意図的に `undefined`/`null` を出したい場合は、その値を明示的に供給します：
`supplyPath(['name'], undefined)`。
:::

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

### `z.custom()` / `z.instanceof()` の扱い

`z.custom()` は実行時に「何を生成すべきか」のヒントがありません。そのため、本ライブラリはスキーマの `meta` から生成関数を読み取ります。メタキー名は [`customMockKey`](/ja/guide/configuration#custommockkey) で設定可能（既定 `'mock'`）。

```ts
const FileSchema = z.custom<File>((v) => v instanceof File).meta({
  mock: (faker) => new File(['x'], faker.system.fileName()),
})

const BigDec = z.instanceof(BigDecimal).meta({
  mock: () => new BigDecimal('1.5'),
})

const mock = initGenerator().generate(z.object({ file: FileSchema, n: BigDec }))
```

meta の値は関数 `(faker, options) => unknown` でもプレーンな値でも構いません。

`z.custom` のスロットに meta `mock` も `supplyRef` も指定されていない場合、その値は**省略扱い**になります。配列・オブジェクト・record・map・set からは黙って脱落し、tuple（長さ固定で脱落不可）では警告が出ます。

テスト固有の値を一発で固定したい場合は `supplyRef` が meta より優先されます。

```ts
const mock = initGenerator()
  .supplyRef(FileSchema, new File(['fixed'], 'fixed.txt'))
  .generate(FileSchema)
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

### 全体の優先順位

すべてのカスタマイズ方法を含めた優先順位：

1. **`supplyPath`** — 一致するパスは何よりも優先される（最も具体的な位置指定）
2. **`consistentKey` レジストリ** — 整合性付きスキーマとして登録されている場合
3. **`supply` / `supplyRef` / `override`** — 統合された custom generator chain（先に登録した方が優先）
4. **`keyMapping`** — プロパティ名 → faker のオプトインマッピング（プリミティブ葉のみ）
5. **`z.custom().meta(...)`** — `z.custom` / `z.instanceof` の meta ベース生成
6. **デフォルト生成** — ライブラリ既定のルール

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
