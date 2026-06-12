# API リファレンス

`zod-v4-mocks` が公開するのは `initGenerator` という 1 つのファクトリ関数だけで、
これが `MockGenerator` を返します。生成・カスタマイズ・シリアライズ・ファイル出力
といったその他の機能は、すべてこのインスタンスのメソッドです。

このリファレンスは目的別のページに分かれています:

- **[生成](/ja/api/generation)** — `generate`, `multiGenerate`, `generateMany`, `factory`
- **[カスタマイズ](/ja/api/customization)** — `supply`, `supplyRef`, `supplyPath`, `override`, `register`, `updateConfig`
- **[シリアライズと出力](/ja/api/serialization)** — `serialize`, `serializeBinary`, `deserialize`, `serializePortable`, `deserializePortable`, `output`
- **[型定義](/ja/api/types)** — `MockConfig`, `CustomGeneratorType`, `GeneraterOptions`, `OutputOptions`, `BinaryOptions`, `PortableOptions`, `PathSegment`、および re-export

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

全オプションは [`MockConfig`](/ja/api/types#mockconfig)、各設定の解説は
[設定ガイド](/ja/guide/configuration) を参照してください。

## MockGenerator

`initGenerator()` が返すクラスインスタンスです。モックデータの生成・カスタマイズ・出力を行います。

### メソッドチェーン

カスタマイズ・設定系のメソッドは同じインスタンスを返すためチェーンできます。
データや文字列を生成する終端メソッドはチェーンできません。

| メソッド | 戻り値 | チェーン可否 |
|--------|---------|-----------|
| `supply` / `supplyRef` / `supplyPath` | `MockGenerator` | ✅ |
| `override` | `MockGenerator` | ✅ |
| `register` | `MockGenerator` | ✅ |
| `updateConfig` | `MockGenerator` | ✅ |
| `generate` / `multiGenerate` / `generateMany` | データ | ❌ |
| `factory` | `{ next, take }` | ❌ |
| `serialize` / `serializeBinary` / `serializePortable*` | `string` / `Uint8Array` | ❌ |
| `deserialize` / `deserializePortable` | データ | ❌ |
| `output` | 出力パス `string` | ❌ |

```ts
const data = initGenerator({ seed: 42 })
  .supply(z.ZodString, 'fixed')
  .override(customGen)
  .generate(schema)
```

## エクスポート一覧

```ts
import {
  initGenerator,             // ファクトリ関数
  ITEM_MARKER,               // '$item' — 配列/Set/タプル要素用の supplyPath マーカー
  VALUE_MARKER,              // '$value' — Record/Map 値用の supplyPath マーカー
  type MockGenerator,        // ジェネレータクラスの型
  type MockConfig,           // 設定の型
  type CustomGeneratorType,  // カスタムジェネレータの型
  type GeneraterOptions,     // 生成オプションの型
  type OutputOptions,        // 出力オプションの型
  type PortableOptions,      // 可搬シリアライズオプションの型
  type PathSegment,          // supplyPath のセグメント型
  type LocaleType,           // ロケール型
  type Faker,                // faker.js の Faker 型（re-export）
  type Randomizer,           // faker.js の Randomizer 型（re-export）
} from 'zod-v4-mocks'
```
