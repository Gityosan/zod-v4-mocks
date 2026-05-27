# シリアライズと出力

生成したデータを文字列・バイナリバッファ・ファイルに変換するメソッドと、対応する
デシリアライザです。いずれもチェーン不可です。

## メソッドの選び方

| メソッド | 出力 | ランタイム | 保持される型 | 完全な round-trip |
|--------|--------|---------|-----------|---------------------|
| `serialize` | `.ts` / `.js` / `.json` のソース文字列 | 任意（文字列のみ） | ts/js では Date, BigInt, Map, Set, Symbol, File, Blob | ❌（ソーステキスト、JSON は型が失われる） |
| `serializeBinary` | `Buffer`（`v8.serialize`） | **Node 専用** | Date, Map, Set, RegExp, BigInt, TypedArray, `undefined`, 循環参照 | ✅ |
| `serializePortable` | 可搬な文字列（seroval） | **任意**（Node ↔ ブラウザ） | 上記 **＋** `NaN`/`Infinity`, 共有参照, `Symbol`, URL/URLSearchParams/Headers | ✅ |
| `output` | ディスク上のファイル | **Node 専用** | 拡張子による（下記参照） | `binary: true` で ✅ |

目安: 人間が読むフィクスチャには **`serialize`**、Node 専用の完全なバイナリには
**`serializeBinary`**、データがランタイムをまたぐ場合（Node で生成しブラウザで復元など）
には **`serializePortable`**。

## serialize

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

## serializeBinary

```ts
serializeBinary(data: unknown): Buffer
```

Node.js の structured clone アルゴリズム (`v8.serialize`) を使ってデータをバイナリ `Buffer` にシリアライズします。`Date` / `Map` / `Set` / `RegExp` / `BigInt` / `TypedArray` / `undefined` / 循環参照を情報損失なく保持できます。復元は Node.js 環境上で `deserialize`（または `v8.deserialize`）でのみ可能です。

```ts
const data = generator.generate(schema)
const buf = generator.serializeBinary(data) // Buffer
```

## deserialize

```ts
deserialize<T = unknown>(input: Buffer | Uint8Array | string): T
```

`serializeBinary` または `output({ binary: true })` で書き出した値を復元します。`Buffer`/`Uint8Array` または `.bin` ファイルのパスを受け取れます。型引数を渡すと結果をその型としてキャストします。

```ts
// 型引数で結果に型を付ける
const restored = generator.deserialize<User>('./mocks/user.bin')

// Buffer から
const restored = generator.deserialize<User>(generator.serializeBinary(data))
```

## serializePortable / serializePortableAsync

```ts
serializePortable(data: unknown, options?: PortableOptions): string
serializePortableAsync(data: unknown, options?: PortableOptions): Promise<string>
```

[seroval](https://github.com/lxsmnsyc/seroval) を使ってデータを**可搬な文字列**にシリアライズします。`serializeBinary`（Node 専用の `v8`）と違い、**あらゆる JS ランタイム**間で往復できます（Node↔ブラウザ、ブラウザ↔ブラウザ）。`Date`・`RegExp`・`Map`・`Set`・`BigInt`・`TypedArray`・`undefined`・`NaN`/`Infinity`・循環/共有参照、および（同梱プラグインで）`URL`・`URLSearchParams`・`Headers` を保持します。

`File`・`Blob`・`FormData` はバイトを非同期に読み出すため、`serializePortableAsync` でのみ往復できます（同期版がこれらに遭遇した場合は、非同期版を使うよう促す明示エラーを投げます）。

`Symbol` は対応しています。レジストリシンボル（`Symbol.for`）は同一性を保ったまま往復し、記述付きシンボル（`Symbol('x')`、例: `z.symbol()`）は description で往復します（**同一ペイロード内**の参照については同一性も維持）。原理的な制約が 2 つあります: 無名シンボルの**プロセス跨ぎの `===` 同一性**は復元不可（定義上一意）で、**オブジェクトのキー**に使った Symbol は非保持です（値・Map キー・Set 要素のみ対応）。実装上の注意として、Symbol は内部マーカーキーで符号化されるため、**唯一のキー**がそのマーカー（`$$zod-v4-mocks/symbol$$`）である手作りの plain object は復元時に `Symbol` になります。生成モックがそのキーを作ることはないので、手で組んだ同形データのみが対象です。

```ts
const data = generator.generate(schema)

// クロスランタイムな文字列
const str = generator.serializePortable(data)

// JSON フィールド / 環境変数 / ヘッダーへ埋め込む用の base64
const b64 = generator.serializePortable(data, { base64: true })

// 非同期 — データに File / Blob / FormData を含む場合は必須
const asyncStr = await generator.serializePortableAsync(data)
```

## deserializePortable

```ts
deserializePortable<T = unknown>(input: string, options?: PortableOptions): T
```

`serializePortable` / `serializePortableAsync` が生成した値を、任意の JS ランタイムで復元します。base64 で符号化した場合は `{ base64: true }` を渡してください。型引数を渡すと結果をその型としてキャストします。

```ts
const restored = generator.deserializePortable<User>(str)
const restoredFromB64 = generator.deserializePortable<User>(b64, { base64: true })
```

::: warning 復元時に評価されます
`deserializePortable` はシリアライズ済み文字列を評価して復元します。自分で生成したデータのみを復元し、信頼できない入力は決して渡さないでください。
:::

### PortableOptions

```ts
type PortableOptions = {
  base64?: boolean // 文字列を base64 符号化する（テキスト安全）。deserializePortable にも同じフラグを渡す
}
```

## output

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

// `binary: true` — ts/js 出力のときに、同名の <name>.bin（v8.serialize の生データ）を
// 同じディレクトリに書き出し、.ts / .js 側は import 時に `.bin` を `v8.deserialize`
// する薄い ESM ラッパーになります。Date / Map / Set / RegExp / BigInt / TypedArray /
// undefined / 循環参照をすべて情報損失なく保持しつつ、消費側はふつうに
// `import { mockData } from './user'` として扱えます。エクスポート値は
// `unknown` 型なので、消費側でキャストするか、`deserialize<T>()` を直接呼んで
// 型付けしてください。
generator.output(data, { path: './mocks/user.ts', binary: true })
generator.output(data, { path: './mocks/user.js', binary: true })

// エクスポート名とヘッダー/フッターをカスタマイズ
generator.output(data, {
  path: './mocks/user.ts',
  exportName: 'generatedMockData',
  header: "import type { User } from './types';",
  footer: 'export type MockData = typeof generatedMockData;',
})
```

### OutputOptions

```ts
type OutputOptions = {
  path?: string                    // 出力先パス（デフォルト: ./__generated__/generated-mock-data.<ext>）
  ext?: 'json' | 'js' | 'ts'       // 拡張子（path から推測、未指定時は 'ts'）
  exportName?: string              // エクスポート変数名（デフォルト: 'mockData'、ts/js のみ）
  header?: string                  // 出力内容の先頭に追加する文字列（json では無視）
  footer?: string                  // 出力内容の末尾に追加する文字列（json では無視）
  binary?: boolean                 // ts/js に対し、<name>.bin とそれを復元するラッパーを書き出す。json では無視
}
```

### 出力形式

| 拡張子 | 形式 | 特殊型の扱い |
|--------|------|-------------|
| `.ts` / `.js` | `export const <exportName> = ...` | Date, BigInt, Map, Set, Symbol, File, Blob を正確にシリアライズ |
| `.ts` / `.js` + `binary: true` | ESM ラッパー + 同名 `.bin`（v8 structured clone）| Date, Map, Set, RegExp, BigInt, TypedArray, `undefined`, 循環参照を保持。エクスポートは `unknown` 型なので、消費側でキャストするか `deserialize<T>()` を直接使用。Node.js 限定 |
| `.json` | JSON | Date は ISO文字列、BigInt は文字列化、Map/Set/Symbol は情報損失（警告あり）。`binary` は無視 |

::: warning JSON 出力時のデータ損失
JSON では表現できない型（BigInt, Symbol, Map, Set, File, Blob）を含むデータを `.json` で出力すると、データの正確性が失われます。警告メッセージが出力されるので、`.ts` / `.js`（必要に応じて `binary: true`）の使用を検討してください。
:::

::: info `binary: true`（完全な round-trip）
`binary: true` を指定すると、`output()` は 2 つのファイルを書き出します:

- `<name>.bin` — `v8.serialize` の生バッファ。Zod が生成するあらゆる値（循環参照を含む）を完全に保持
- `<name>.ts` / `<name>.js` — import 時に同名の `.bin` を `v8.deserialize` で遅延復元する薄い ESM ラッパー。消費側は `import { mockData } from './user'` でそのまま使える

エクスポート値は `unknown` 型です。消費側でキャストするか、ラッパーを介さず `deserialize<T>('./user.bin')` を直接呼んで型付けしてください。`.bin` のファイル名は常にラッパーのベース名から自動導出され、個別には変更できません。ラッパーは ESM (`import.meta.dirname`) 前提で Node.js 20.11+ が必要です。
:::
