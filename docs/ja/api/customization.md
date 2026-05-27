# カスタマイズ

[生成](/ja/api/generation) メソッドを呼ぶ前に、*何を* 生成するかを調整するメソッド群
です。いずれもチェーン可能で、同じ `MockGenerator` インスタンスを返します。

3 つの `supply*` メソッドは、固定の精度が段階的に上がります: **型** 単位
（`supply`）、**スキーマ参照** 単位（`supplyRef`）、**パス** 単位（`supplyPath`）。

## supply

```ts
supply(constructor: z.core.$constructor<any>, value: any): MockGenerator
```

特定のZod型に固定値を設定します。同じ型に複数回設定した場合、最初に設定した値が優先されます。

```ts
generator
  .supply(z.ZodString, 'テスト文字列')
  .supply(z.ZodEmail, 'test@example.com')
  .generate(schema)
```

## supplyRef

```ts
supplyRef(subSchema: z.core.$ZodType, value: unknown): MockGenerator
```

その型のすべてのスキーマではなく、**特定のスキーマインスタンス**（参照）にだけ固定値を
割り当てます。2 つのフィールドが同じ Zod 型でも片方だけ固定したい場合や、`z.custom()`
のように本来モックできないスキーマに値を与えたい場合に使います。競合時は最初に登録した
ものが優先されます。

```ts
const SpecialId = z.string()

const schema = z.object({
  id: z.string(),        // ランダムなまま
  specialId: SpecialId,  // 常に 'FIXED'
})

generator
  .supplyRef(SpecialId, 'FIXED')
  .generate(schema)
```

## supplyPath

```ts
supplyPath(path: PathSegment[], value: unknown): MockGenerator
```

生成される構造の **特定の位置** に固定値を割り当てます。位置はセグメントのパスで指定します
（[`PathSegment`](/ja/api/types#pathsegment) は `string | number | symbol`）:

- **object** → 文字列キー
- **array / tuple** → 数値インデックス
- **record / map** → リテラルキー（ランダム生成されなくても注入される）

2 つのマーカー定数を使うと、1 要素ではなくその位置の *すべて* の要素を対象にできます:

| マーカー | 値 | 対象 |
|--------|-------|---------|
| `ITEM_MARKER` | `'$item'` | 配列 / Set / タプルのすべての要素 |
| `VALUE_MARKER` | `'$value'` | Record / Map のすべての値 |

競合時はリテラルセグメントが常にマーカーより優先されます（specificity が高い方が勝つ）。
`'$key'` の指定は意図的に非対応です。

```ts
import { initGenerator, ITEM_MARKER, VALUE_MARKER } from 'zod-v4-mocks'

const schema = z.object({
  user: z.object({ name: z.string() }),
  tags: z.array(z.string()),
  scores: z.record(z.string(), z.number()),
})

generator
  .supplyPath(['user', 'name'], 'Alice')   // 特定のフィールド
  .supplyPath(['tags', 0], 'first')         // 配列の先頭要素
  .supplyPath(['tags', ITEM_MARKER], 'x')   // 配列のすべての要素
  .supplyPath(['scores', VALUE_MARKER], 0)  // Record のすべての値
  .generate(schema)
```

::: tip 配列の長さ
リテラルな数値インデックスを指定すると、対象インデックスが存在するよう生成される配列が
拡張されます（`supplyPath(['x', 1e8], …)` のような打ち間違いに備えて内部上限あり）。
:::

## override

```ts
override(customGenerator: CustomGeneratorType): MockGenerator
```

カスタムジェネレータ関数を登録します。関数が `undefined` を返した場合、デフォルトの生成ロジックにフォールバックします。

```ts
const customGen: CustomGeneratorType = (schema, options) => {
  if (schema instanceof z.ZodString) {
    return options.faker.person.fullName()
  }
}

generator.override(customGen).generate(schema)
```

関数のシグネチャは [`CustomGeneratorType`](/ja/api/types#customgeneratortype) と
[`GeneraterOptions`](/ja/api/types#generateroptions)、実装パターンは
[カスタムジェネレータガイド](/ja/guide/custom-generator) を参照してください。

## register

```ts
register(schemas: z.ZodType[]): MockGenerator
```

一貫性のあるデータ生成のためにスキーマを登録します。`consistentKey` と併用して、同じメタデータキーを持つフィールドに同じ値を割り当てます。

```ts
const UserId = z.uuid().meta({ name: 'UserId' })

generator
  .register([UserId])
  .generate(z.object({ userId: UserId }))
```

`register` は内部で各スキーマの値を `config.array.max` 個分プリ生成し、valueStore に保存します。生成時に同じメタデータキーのスキーマが見つかると、保存された値から配列インデックスに応じて値が取り出されます。

## updateConfig

```ts
updateConfig(newConfig?: Partial<MockConfig>): MockGenerator
```

設定を更新します。既存の `supply` / `override` の設定は維持されます。

```ts
generator.updateConfig({ seed: 42, array: { min: 5, max: 10 } })
```
