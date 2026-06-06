# 設定

`initGenerator()` にオプションオブジェクトを渡すことで、モック生成の挙動をカスタマイズできます。

## MockConfig

```ts
interface MockConfig {
  locale?: LocaleType | LocaleType[]   // default: [en, base]
  randomizer?: Randomizer              // faker.js のランダマイザー
  seed: number                         // default: 1
  array: { min: number; max: number }  // default: { min: 1, max: 3 }
  map: { min: number; max: number }    // default: { min: 1, max: 3 }
  set: { min: number; max: number }    // default: { min: 1, max: 3 }
  record: { min: number; max: number } // default: { min: 1, max: 3 }
  optionalProbability: number          // default: 0.5
  nullableProbability: number          // default: 0.5
  defaultProbability: number           // default: 0.5
  recursiveDepthLimit?: number         // default: 5
  consistentKey?: string               // メタデータのキー名（一貫値生成用）
  customMockKey?: string               // default: 'mock' (z.custom のメタキー)
  keyMapping?: 'off' | 'auto' | KeyMapper // default: 'off'
  preflightCheck?: boolean              // default: true
}
```

## 基本的な設定例

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
// tags は 2〜5 個生成される
```

## seed（シード値）

`seed` を指定すると再現性のあるモックデータが生成されます。同じシード値を使えば、毎回同じ結果が得られるため、テストの安定性を確保したい場合に有用です。

```ts
const gen1 = initGenerator({ seed: 42 })
const gen2 = initGenerator({ seed: 42 })

const schema = z.string()
gen1.generate(schema) === gen2.generate(schema) // true
```

再現性はすべての対応済みスキーマで保証されています。transform や regex パターンを含むスキーマでも同様です。

```ts
const schema = z.string().transform((val) => val.toUpperCase())

const g1 = initGenerator({ seed: 444 })
const g2 = initGenerator({ seed: 444 })

const results1 = Array.from({ length: 3 }, () => g1.generate(schema))
const results2 = Array.from({ length: 3 }, () => g2.generate(schema))
// results1 と results2 は完全に一致する
```

::: tip 再現性を保つためのヒント
カスタムジェネレータ（`override`）を使う場合は、`Math.random()` や `Date.now()` ではなく、引数で渡される `options.faker` を使用してください。`faker` インスタンスは seed に基づいた RNG を使用しています。
:::

## locale（ロケール）

[▶ Playground で試す](/ja/playground/?example=locale)

faker.js のロケールを指定します。文字列を1つ指定するか、配列で複数ロケールを優先順に指定できます。

```ts
// 日本語ロケール
const generator = initGenerator({ locale: 'ja' })

// 複数ロケール（優先順）
const generator = initGenerator({ locale: ['ja', 'en'] })
```

デフォルトは `[en, base]`（faker.js のデフォルト）です。ロケールを変更すると、`faker.person.fullName()` 等で生成される名前が対応言語になります。

## コレクションのサイズ制御

`array`, `map`, `set`, `record` の `min`/`max` で、それぞれのコレクションの生成要素数を制御できます。

```ts
const generator = initGenerator({
  array: { min: 2, max: 5 },   // 配列の長さ: 2〜5
  record: { min: 1, max: 3 },  // レコードのエントリ数: 1〜3
  map: { min: 2, max: 4 },     // Map のエントリ数: 2〜4
  set: { min: 1, max: 3 },     // Set の要素数: 1〜3
})
```

::: info スキーマ側の制約との優先順位
スキーマに `.min()` / `.max()` / `.nonempty()` が設定されている場合、スキーマ側の制約が優先されます。

```ts
const gen = initGenerator({ array: { min: 1, max: 2 } })
const schema = z.array(z.string()).min(5) // スキーマの min(5) が優先
const result = gen.generate(schema)
// result.length >= 5 が保証される
```
:::

## 確率の制御

Optional / Nullable / Default 型で生成される値の確率を制御します。値は `0`（0%）〜 `1`（100%）の範囲で指定します。

### optionalProbability

`optional` 型で**値が省略される（`undefined` になる）確率**です。

```ts
// 30%の確率で undefined になる
const gen = initGenerator({ optionalProbability: 0.3 })

// 必ず値が生成される（undefined にならない）
const gen = initGenerator({ optionalProbability: 0 })

// 必ず undefined になる
const gen = initGenerator({ optionalProbability: 1 })
```

### nullableProbability

`nullable` 型で **`null` が生成される確率**です。

```ts
// 30%の確率で null になる
const gen = initGenerator({ nullableProbability: 0.3 })
```

### defaultProbability

`default` 型で**デフォルト値が使用される確率**です。

```ts
const gen = initGenerator({ defaultProbability: 0.8 })

const schema = z.boolean().default(true)
// 80%の確率で true（デフォルト値）、20%の確率でランダムな boolean
```

## recursiveDepthLimit

再帰的なスキーマ（`z.lazy()` やゲッターベースの循環参照）の最大深度です。デフォルトは `5` です。

```ts
const generator = initGenerator({ recursiveDepthLimit: 3 })
```

深さの上限に達すると、空のオブジェクト `{}` がターミネーターとして返されます。

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
//                                                        ↑ 深さ制限で空オブジェクト
```

ゲッターベースの循環参照でも同様に動作します。

```ts
const Node = z.object({
  value: z.number(),
  get next() {
    return Node.optional()
  },
})

const gen = initGenerator({ recursiveDepthLimit: 3 })
const result = gen.generate(Node) // 正常に終了
```

::: info lazyDepthLimit（非推奨）
`lazyDepthLimit` は `recursiveDepthLimit` と同じ機能です。`recursiveDepthLimit` が設定されている場合はそちらが優先されます。新しいコードでは `recursiveDepthLimit` を使用してください。
:::

## consistentKey と register

関連するフィールド間で**一貫した値**を生成するために使用します。たとえば、`User.id` と `Comment.userId` に同じ UUID を割り当てたい場合に便利です。

### 仕組み

1. 共通スキーマに `.meta()` でメタデータキーを設定
2. `initGenerator` に `consistentKey` を指定
3. `.register()` でスキーマを登録
4. 登録されたスキーマが使われる箇所では、一貫した値が生成される

### 実用例

```ts
import { z } from 'zod'
import { initGenerator } from 'zod-v4-mocks'

// メタデータのキー名を設定
const consistentKey = 'name'
const UserId = z.uuid().meta({ [consistentKey]: 'UserId' })
const CommentId = z.uuid().meta({ [consistentKey]: 'CommentId' })
const PostId = z.uuid().meta({ [consistentKey]: 'PostId' })

// スキーマ定義
const userSchema = z.object({
  id: UserId,       // ← 同じ UserId が生成される
  name: z.string(),
})

const commentSchema = z.object({
  id: CommentId,
  postId: PostId,   // ← 同じ PostId が生成される
  user: userSchema,
  userId: UserId,   // ← userSchema.id と同じ値
  value: z.string(),
})

const postSchema = z.object({
  id: PostId,       // ← commentSchema.postId と同じ値
  comments: z.array(commentSchema),
  value: z.string(),
})

// register でスキーマを登録し、generate で生成
const schemas = [CommentId, UserId, PostId]
const mock = initGenerator({ consistentKey })
  .register(schemas)
  .generate(z.array(postSchema))
```

上記の例では、以下のような一貫性が保証されます:

- 各 Post の `id` と、その Post 内の Comment の `postId` が一致
- 各 User の `id` と `userId` が一致

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

`z.custom()` / `z.instanceof()` のスキーマから生成関数を読み取る meta 属性名。既定 `'mock'`。

```ts
const Schema = z.custom<File>().meta({ mock: (faker) => new File(['x'], faker.system.fileName()) })

initGenerator().generate(Schema) // meta.mock を呼び出す
```

他の meta 利用者と衝突を避けたい場合はキー名を変更：

```ts
const Schema = z.custom<File>().meta({ zodMock: () => new File([], 'a') })
initGenerator({ customMockKey: 'zodMock' }).generate(Schema)
```

詳しい使い方は [カスタムジェネレータ — `z.custom()` / `z.instanceof()` の扱い](/ja/guide/custom-generator#z-custom-z-instanceof-の扱い) を参照。

## keyMapping

[▶ Playground で試す](/ja/playground/?example=key-mapping)

プロパティ名 → `faker` 関数のオプトインマッピング。プリミティブ葉スキーマ（string / number / boolean / date）にのみ作用します。既定 `'off'`。

- `'off'` — マッピング無し（既定動作）
- `'auto'` — 組み込みのデフォルトを使用（`firstName`, `email`, `age`, `createdAt` 等）
- `KeyMapper` 関数 — `(key, schema, faker, options) => value | undefined`。`undefined` を返すと組み込みデフォルトにフォールバック

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

`keyMapping` は **`supplyPath` および `supply` / `supplyRef` / `override` チェーンの後に**実行されるため、明示的なオーバーライドが常に優先されます。

```ts
initGenerator({ keyMapping: 'auto' })
  .supplyPath(['email'], 'override@x')
  .generate(Schema)
// email は 'override@x'（faker email ではない）
```

組み込みマッピングの範囲（大文字小文字・区切り文字を無視 — `firstName`, `first_name`, `FIRST-NAME` はすべて同一視）：

| キー | マッピング先 |
|---|---|
| `firstName` / `lastName` / `name` | `faker.person.*` |
| `email`, `phone`, `url`, `avatar` | `faker.internet.*` |
| `street` / `city` / `country` / `zip` | `faker.location.*` |
| `company`, `jobTitle`, `department` | `faker.company.*`, `faker.person.jobTitle()` |
| `description`, `title`, `content` | `faker.lorem.*` |
| `age`, `price`, `quantity`, `rating`, `latitude`, `longitude` | 適切な範囲の `faker.number.*` |
| `createdAt`, `updatedAt`, `birthDate` | `faker.date.*` |

カスタムマッチャー：

```ts
import type { KeyMapper } from 'zod-v4-mocks'

const myMap: KeyMapper = (key, schema, faker) => {
  if (key === 'sku') return faker.string.alphanumeric(10).toUpperCase()
  return undefined // 組み込みデフォルトへフォールバック
}

initGenerator({ keyMapping: myMap }).generate(z.object({ sku: z.string() }))
```

## preflightCheck

[▶ Playground で試す](/ja/playground/?example=preflight)

生成前に、ライブラリはスキーマをプリフライト走査します。既定は `true`。ジェネレータが安全にモックできない構造を検出し、該当パスを示して即座に失敗させるか、最小限の修正が可能なものは自動修正します。`initGenerator({ preflightCheck: false })` で無効化できます。

### error レベルのチェック（生成前に throw）

- **tuple 位置の z.custom()** — 固定長 tuple 内の meta 未設定 `z.custom()` / `z.instanceof()`。tuple はスロットを脱落させられないため不正値が残ります。`.meta({ mock: ... })` または `supplyRef()` で解消。
- **非互換な z.intersection()** — どの値でも両側を満たせないケース：異なるプリミティブ型（`z.string()` & `z.number()`）、共通値の無い enum、レンジが交わらない number。
- **不正な z.record() キー型** — string / number / symbol を生成できないキー型。

```ts
const Schema = z.object({
  pair: z.tuple([z.string(), z.custom<File>()]),
})
initGenerator().generate(Schema)
// throws: Preflight check found 1 issue(s):
//   - pair[1]: z.custom()/z.instanceof() sits at a tuple position ...
```

`supply` / `override` が登録されている場合、ライブラリは網羅性を検証できないため、error レベルの指摘は warning に降格されます。

### warning レベルのチェック（報告のみ・生成は継続）

- **無視される .refine() / .superRefine()** — refine の述語は生成時に捨てられるため、生成値がそれを満たさない可能性があります。`.parse()` を通す必要があるなら `supplyPath()` / `supplyRef()` で有効値を固定してください。
- **成立しない number / bigint レンジ** — `min` が `max` より大きい（例：`z.number().min(10).max(5)`）。ジェネレータはレンジをクランプしますが、値は `.parse()` を通りません。
- **競合する z.string() チェック** — 同種の競合するチェックが複数（`regex` / `length` / `startsWith` / `endsWith` / `toUpperCase`・`toLowerCase`）。各種別の最後の1つだけが適用されます。
- **未対応のスキーマ型** — ジェネレータが扱えないスキーマ（`z.function()` / `z.promise()`、または新しい Zod で追加された型）。
- **再帰 z.lazy() が自身のアンカー** — 自動修正されます（下記）。

### 自動修正

安全かつ最小限のスキーマ修正が存在する問題については、プリフライトは **warning** を出したうえで修正を自動適用し、修正後のスキーマで生成を続行します。コードを変更する必要はありません。

現状は、再帰アンカーが `z.lazy()` 自身になっているケースが対象です。深さ制限は object/array 等の参照を追跡し `z.lazy()` は追跡しないため、このスキーマはそのままではスタックオーバーフローします：

```ts
// 検出 → 警告 → 自動修正され、生成は正常に終了する
const Tree = z.lazy(() =>
  z.object({ value: z.string(), children: z.array(Tree) }),
)
initGenerator().generate(Tree)
// [preflight] (root): A recursive z.lazy() is its own recursion anchor ...
```

警告では、より明快な手書きの形（`z.object({ ..., children: z.lazy(() => z.array(Tree)) })`）も併せて提案します。`preflightCheck` が `false` のときは自動修正もスキップされます。

::: tip
プリフライトは前方互換のセーフティネットでもあります。Zod が新しいスキーマ型を追加した際、ジェネレータがまだ扱えないケースを、生成の奥深くで失敗させる代わりに、ここで error として弾くか warning + 自動修正で表面化できます。
:::

## updateConfig

設定は `updateConfig()` で後から変更することも可能です。

```ts
const generator = initGenerator({ seed: 1 })
generator.generate(z.string()) // seed: 1 で生成

generator.updateConfig({ seed: 42, array: { min: 5, max: 10 } })
generator.generate(z.string()) // seed: 42 で生成
```

`updateConfig` は既存の `supply` / `override` の設定を維持したまま、config のみを更新します。

## 次のステップ

- [カスタムジェネレータ](/ja/guide/custom-generator) - supply / override / register の使い方
- [スキーマ対応状況](/ja/guide/schema-support) - 対応スキーマの詳細
- [API リファレンス](/ja/api/) - 全メソッドの詳細
