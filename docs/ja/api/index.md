# API リファレンス

## initGenerator

```ts
function initGenerator(config?: Partial<MockConfig>): MockGenerator
```

`MockGenerator` インスタンスを生成します。`config` を省略した場合はデフォルト設定が使用されます。

```ts
import { initGenerator } from 'zod-v4-mocks'

// デフォルト設定
const generator = initGenerator()

// カスタム設定
const generator = initGenerator({
  seed: 42,
  array: { min: 2, max: 5 },
  locale: 'ja',
})
```

## MockGenerator

`initGenerator()` が返すクラスインスタンスです。モックデータの生成・カスタマイズ・出力を行います。すべてのメソッド（`generate` / `multiGenerate` 以外）はメソッドチェーンに対応しています。

### generate

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

### multiGenerate

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

### supply

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

### override

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

### register

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

### updateConfig

```ts
updateConfig(newConfig?: Partial<MockConfig>): MockGenerator
```

設定を更新します。既存の `supply` / `override` の設定は維持されます。

```ts
generator.updateConfig({ seed: 42, array: { min: 5, max: 10 } })
```

### serialize

```ts
serialize(data: unknown, options?: OutputOptions): string
```

モックデータをファイルに書き込まずに文字列としてシリアライズします。`output` が書き込む内容と同じ文字列を返します。出力をさらにカスタマイズしてから自分でファイルに書き込みたい場合に便利です。

```ts
const data = generator.generate(schema)

// シリアライズした文字列を取得（デフォルト: TypeScript 形式）
const content = generator.serialize(data)
// => "export const mockData = {\n  \"id\": \"...\",\n  ...\n};\n"

// エクスポート名とヘッダー/フッターをカスタマイズ
const content = generator.serialize(data, {
  exportName: 'generatedMockData',
  header: "import type { User } from './types';",
  footer: 'export type MockData = typeof generatedMockData;',
})
```

### serializeBinary

```ts
serializeBinary(data: unknown): Buffer
```

Node.js の structured clone アルゴリズム (`v8.serialize`) を使ってデータをバイナリ `Buffer` にシリアライズします。`Date` / `Map` / `Set` / `RegExp` / `BigInt` / `TypedArray` / `undefined` / 循環参照を情報損失なく保持できます。復元は Node.js 環境上で `deserialize`（または `v8.deserialize`）でのみ可能です。

```ts
const data = generator.generate(schema)
const buf = generator.serializeBinary(data) // Buffer
```

### deserialize

```ts
deserialize(input: Buffer | Uint8Array | string): unknown
```

`serializeBinary` または `output({ ext: 'bin' })` で書き出した値を復元します。`Buffer`/`Uint8Array` または `.bin` ファイルのパスを受け取れます。

```ts
// Buffer から
const restored = generator.deserialize(generator.serializeBinary(data))

// output() で書き出したファイルから
generator.output(data, { path: './mocks/user.bin' })
const restored = generator.deserialize('./mocks/user.bin')
```

### output

```ts
output(data: unknown, options?: OutputOptions): string
```

モックデータをファイルに出力します。Node.js 環境のみで動作します。出力パスを文字列で返します。

```ts
const data = generator.generate(schema)

// TypeScript ファイルとして出力（デフォルト）
generator.output(data)
// => "./__generated__/generated-mock-data.ts"

// パスと拡張子を指定
generator.output(data, { path: './mocks/user.json' })
generator.output(data, { path: './mocks/user.ts' })
generator.output(data, { path: './mocks/user.js' })
generator.output(data, { path: './mocks/user.bin' }) // v8.serialize バイナリ

// エクスポート名とヘッダー/フッターをカスタマイズ
generator.output(data, {
  path: './mocks/user.ts',
  exportName: 'generatedMockData',
  header: "import type { User } from './types';",
  footer: 'export type MockData = typeof generatedMockData;',
})
```

#### OutputOptions

```ts
type OutputOptions = {
  path?: string                         // 出力先パス（デフォルト: ./__generated__/generated-mock-data.ts）
  ext?: 'json' | 'js' | 'ts' | 'bin'    // 拡張子（path から推測、未指定時は 'ts'）
  exportName?: string                   // エクスポート変数名（デフォルト: 'mockData'、ts/js のみ）
  header?: string                       // 出力内容の先頭に追加する文字列（json/bin では無視）
  footer?: string                       // 出力内容の末尾に追加する文字列（json/bin では無視）
}
```

#### 出力形式

| 拡張子 | 形式 | 特殊型の扱い |
|--------|------|-------------|
| `.ts` / `.js` | `export const <exportName> = ...` | Date, BigInt, Map, Set, Symbol, File, Blob を正確にシリアライズ |
| `.json` | JSON | Date は ISO文字列、BigInt は文字列化、Map/Set/Symbol は情報損失（警告あり） |
| `.bin` | バイナリ（v8 structured clone）| Date, Map, Set, RegExp, BigInt, TypedArray, `undefined`, 循環参照を保持。Node.js 限定 |

::: warning JSON 出力時のデータ損失
JSON では表現できない型（BigInt, Symbol, Map, Set, File, Blob）を含むデータを `.json` で出力すると、データの正確性が失われます。警告メッセージが出力されるので、`.ts` / `.js` / `.bin` 形式の使用を検討してください。
:::

::: info バイナリ形式について
`.bin` は Zod が生成するすべての値（循環参照を含む）を完全に往復できる唯一の形式です。代わりに、ファイルは人間可読ではなく、Node.js 上で `generator.deserialize(path)` または `v8.deserialize(buffer)` を使ってのみデシリアライズできます。
:::

## 型定義

### MockConfig

```ts
interface MockConfig {
  /** @default [en, base] */
  locale?: LocaleType | LocaleType[]
  /** @default generateMersenne53Randomizer() from faker.js */
  randomizer?: Randomizer
  /** @default 1 */
  seed: number
  /** @default { min: 1, max: 3 } */
  array: { min: number; max: number }
  /** @default { min: 1, max: 3 } */
  map: { min: number; max: number }
  /** @default { min: 1, max: 3 } */
  set: { min: number; max: number }
  /** @default { min: 1, max: 3 } */
  record: { min: number; max: number }
  /** @default 0.5 */
  optionalProbability: number
  /** @default 0.5 */
  nullableProbability: number
  /** @default 0.5 */
  defaultProbability: number
  /** @default 5 @deprecated recursiveDepthLimit を使用してください */
  lazyDepthLimit: number
  /** @default 5 */
  recursiveDepthLimit?: number
  /** メタデータのキー名（register と併用） */
  consistentKey?: string
}
```

各設定の詳細は[設定ガイド](/ja/guide/configuration)を参照してください。

### CustomGeneratorType

```ts
type CustomGeneratorType = (
  schema: z.core.$ZodType,
  options: GeneraterOptions,
) => unknown | undefined
```

`undefined` を返した場合、デフォルトの生成ロジックが使用されます。

### GeneraterOptions

```ts
type GeneraterOptions = {
  faker: Faker                          // seeded faker インスタンス
  config: MockConfig                    // 現在の設定
  customGenerator?: CustomGeneratorType // カスタムジェネレータ
  registry: z.core.$ZodRegistry | null  // スキーマレジストリ
  valueStore?: Map<string, unknown[]>   // register で事前生成された値
  arrayIndexes: number[]                // 配列の現在のインデックス
  pinnedHierarchy: Map<string, number>  // 一貫性生成のヒエラルキー
  circularRefs: Map<z.core.$ZodType, number> // 循環参照の深度追跡
}
```

`override` のカスタムジェネレータ内では主に `faker` と `config` を使用します。

### OutputOptions

```ts
type OutputOptions = {
  path?: string
  ext?: 'json' | 'js' | 'ts' | 'bin'
  exportName?: string
  header?: string
  footer?: string
}
```

## エクスポート一覧

```ts
import {
  initGenerator,        // ファクトリ関数
  type MockGenerator,   // ジェネレータクラスの型
  type MockConfig,      // 設定の型
  type CustomGeneratorType,  // カスタムジェネレータの型
  type GeneraterOptions,     // 生成オプションの型
  type OutputOptions,        // 出力オプションの型
  type LocaleType,           // ロケール型
  type Faker,                // faker.js の Faker 型（re-export）
  type Randomizer,           // faker.js の Randomizer 型（re-export）
} from 'zod-v4-mocks'
```
