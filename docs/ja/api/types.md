# 型定義

エクスポートされる型定義です。多くは `import type { … } from 'zod-v4-mocks'` で取り込みます。

## MockConfig

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
  /** @default 5 — 再帰スキーマ（z.lazy / 循環 getter）の最大深度 */
  recursiveDepthLimit?: number
  /** メタデータのキー名（register と併用） */
  consistentKey?: string
  /** @default 'mock' — z.custom()/z.instanceof() 用のカスタムモックジェネレータを引く meta キー */
  customMockKey?: string
  /** @default 'off' — プロパティキーを faker 関数にマッピング: 'off' | 'auto' | KeyMapper */
  keyMapping?: 'off' | 'auto' | KeyMapper
  /** @default true — モック不可能なスキーマを弾く事前チェック（pre-flight）を実行 */
  preflightCheck?: boolean
}
```

各設定の詳細は[設定ガイド](/ja/guide/configuration)を参照してください。

::: info preflightCheck
`preflightCheck` が有効（デフォルト）の場合、`generate` は生成前にスキーマを一度走査し、
安全にモックできないスキーマ（固定長タプル位置にあるモック未指定の `z.custom()` など）
ではエラーを投げます。warning レベルの問題はログ出力され自動修正されます。無効化は
`initGenerator({ preflightCheck: false })`。
:::

## CustomGeneratorType

```ts
type CustomGeneratorType = (
  schema: z.core.$ZodType,
  options: GeneraterOptions,
) => unknown | undefined
```

`undefined` を返した場合、デフォルトの生成ロジックが使用されます。[`override`](/ja/api/customization#override) に渡します。

## GeneraterOptions

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
  pathSupplies: PathSupply[]            // 現在地点で有効な supplyPath エントリ
  keyMappingKey?: string                // この位置で keyMapping 対象となるプロパティ名
  supplyRefTargets: Set<z.core.$ZodType> // supplyRef で登録されたスキーマ参照
  hasOpaqueCustomizer: boolean          // supply/override が登録されると true
  preflightFixes: Map<z.core.$ZodType, z.core.$ZodType> // preflight による自動修正
}
```

`override` のカスタムジェネレータ内では主に `faker` と `config` を使用します。残りは内部の生成状態です。

## OutputOptions

```ts
type OutputOptions = {
  path?: string
  ext?: 'json' | 'js' | 'ts'
  exportName?: string
  header?: string
  footer?: string
  binary?: boolean
}
```

[`serialize`](/ja/api/serialization#serialize) と [`output`](/ja/api/serialization#output) で使用します。各フィールドの説明は [シリアライズと出力](/ja/api/serialization#outputoptions) ページにあります。

## BinaryOptions

```ts
type BinaryOptions = {
  base64?: boolean // 生バイトの代わりに base64 文字列を返す/受け取る（テキスト安全・node 非依存・クロス言語）
}
```

[`serializeBinary`](/ja/api/serialization#serializebinary) と [`deserialize`](/ja/api/serialization#deserialize) で使用します。両側に同じフラグを渡してください。

## PortableOptions

```ts
type PortableOptions = {
  base64?: boolean // 文字列を base64 符号化する（テキスト安全）
}
```

[`serializePortable`](/ja/api/serialization#serializeportable-serializeportableasync) と [`deserializePortable`](/ja/api/serialization#deserializeportable) で使用します。両側に同じフラグを渡してください。

## PathSegment

```ts
type PathSegment = string | number | symbol
```

[`supplyPath`](/ja/api/customization#supplypath) のパスにおける1ステップです。object のキーは
文字列、array/tuple の位置は数値で、2 つのマーカー定数はその位置のすべての要素を対象にします:

```ts
import { ITEM_MARKER, VALUE_MARKER } from 'zod-v4-mocks'

ITEM_MARKER  // '$item'  — 配列 / Set / タプルのすべての要素
VALUE_MARKER // '$value' — Record / Map のすべての値
```

## re-export

```ts
type LocaleType   // keyof typeof allLocales — 有効な faker ロケールキー
type Faker        // faker.js の Faker 型（re-export）
type Randomizer   // faker.js の Randomizer 型（re-export）
```
