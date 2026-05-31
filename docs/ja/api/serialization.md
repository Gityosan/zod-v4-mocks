# シリアライズと出力

生成したデータを文字列・バイナリバッファ・ファイルに変換するメソッドと、対応する
デシリアライザです。いずれもチェーン不可です。

## メソッドの選び方

| メソッド | 出力 | ランタイム | 保持される型 | 完全な round-trip |
|--------|--------|---------|-----------|---------------------|
| `serialize` | `.ts` / `.js` / `.json` のソース文字列 | 任意（文字列のみ） | ts/js では Date, BigInt, Map, Set, Symbol, File, Blob | ❌（ソーステキスト、JSON は型が失われる） |
| `serializeBinary` | `Buffer`（`v8.serialize`） | **Node 専用** | Date, Map, Set, RegExp, BigInt, TypedArray, `undefined`, 循環参照 | ✅ |
| `serializeGraft` | `Uint8Array`（`greft-codec`） | **任意**（Node ↔ ブラウザ ↔ 他言語） | 上記 **＋** Symbol, `NaN`/`Infinity`, 共有参照 | ✅ |
| `serializePortable` | 可搬な文字列（seroval） | **任意**（Node ↔ ブラウザ） | 上記 **＋** URL/URLSearchParams/Headers | ✅ |
| `output` | ディスク上のファイル | **Node 専用** | 拡張子による（下記参照） | `binary` で ✅ |

目安: 人間が読むフィクスチャには **`serialize`**、Node 専用の完全バイナリ（追加依存なし）
には **`serializeBinary`**、任意の JS ランタイム（さらに
[greft-codec](https://github.com/Gityosan/greft) のポート経由で Python / Rust / Go
など他言語）で復元できるコンパクトな完全バイナリには **`serializeGraft`**、JSON や
環境変数に埋め込むプレーンテキストのペイロードが必要な場合には **`serializePortable`**。

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

Node.js の structured clone アルゴリズム (`v8.serialize`) を使ってデータをバイナリ `Buffer` にシリアライズします。`Date` / `Map` / `Set` / `RegExp` / `BigInt` / `TypedArray` / `undefined` / 循環参照を情報損失なく保持できます。復元は Node.js 環境上で `deserialize`（または `v8.deserialize`）でのみ可能です。クロスランタイム／クロス言語のバイナリが必要な場合は [`serializeGraft`](#serializegraft) を使ってください。

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

## serializeGraft

```ts
serializeGraft(data: unknown): Uint8Array
```

[greft-codec](https://github.com/Gityosan/greft) の言語非依存なロスレス形式を使ってデータをバイナリ `Uint8Array` にシリアライズします。`Date` / `Map` / `Set` / `RegExp` / `BigInt` / `TypedArray` / `Symbol` / `undefined` / `NaN`/`Infinity` / 循環・共有参照を情報損失なく保持できます。`serializeBinary`（Node 専用の `v8.serialize`）と異なり、出力は **任意の JS ランタイム** で round-trip でき、greft-codec のポート経由で他言語（Python / Rust / Go など）でもデコードできます。モックデータを他言語のテストフィクスチャとして再利用するのに最適です。

```ts
const data = generator.generate(schema)
const bytes = generator.serializeGraft(data) // Uint8Array
```

## deserializeGraft

```ts
deserializeGraft<T = unknown>(input: Uint8Array | string): T
```

`serializeGraft` または `output({ binary: 'graft' })` で書き出した値を復元します。`Uint8Array`/`Buffer` または `.bin` ファイルのパスを受け取れます。型引数を渡すと結果をその型としてキャストします。

```ts
// 型引数で結果に型を付ける
const restored = generator.deserializeGraft<User>('./mocks/user.bin')

// バイト列から
const restored = generator.deserializeGraft<User>(generator.serializeGraft(data))
```

## serializePortable / serializePortableAsync

```ts
serializePortable(data: unknown, options?: PortableOptions): string
serializePortableAsync(data: unknown, options?: PortableOptions): Promise<string>
```

[seroval](https://github.com/lxsmnsyc/seroval) を使ってデータを**可搬な文字列**にシリアライズします。`serializeGraft` と同様に**あらゆる JS ランタイム**間で往復できますが、バイナリではなくプレーンテキストなので、JSON・環境変数・HTTP ヘッダーの中に埋め込みたいときに便利です。`Date`・`RegExp`・`Map`・`Set`・`BigInt`・`TypedArray`・`undefined`・`NaN`/`Infinity`・循環/共有参照、および（同梱プラグインで）`URL`・`URLSearchParams`・`Headers` を保持します。（他**言語**へ渡すペイロードには `serializeGraft` を推奨します。）

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

// `binary: true`（= `'v8'`）— ts/js 出力のときに、同名の <name>.bin（v8.serialize の
// 生データ）を同じディレクトリに書き出し、.ts / .js 側は import 時に `.bin` を
// `v8.deserialize` する薄い ESM ラッパーになります。Date / Map / Set / RegExp /
// BigInt / TypedArray / undefined / 循環参照を情報損失なく保持しつつ、消費側はふつうに
// `import { mockData } from './user'` として扱えます。エクスポート値は `unknown` 型なので、
// 消費側でキャストするか `deserialize<T>()` を直接呼んで型付けしてください。（Node 専用）
generator.output(data, { path: './mocks/user.ts', binary: true })
generator.output(data, { path: './mocks/user.js', binary: true })

// `binary: 'graft'` — 同じラッパー＋同名 .bin ですが、greft-codec で符号化されます。
// .bin はクロス言語の成果物（任意の JS ランタイム、さらに Python / Rust / Go などの
// ポートでデコード可）で、Symbol と NaN/Infinity も追加で保持します。ラッパーは
// `greft-codec` から `decode` を import するため、消費側にこの（依存ゼロの）パッケージが必要です。
generator.output(data, { path: './mocks/user.ts', binary: 'graft' })

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
  binary?: boolean | 'v8' | 'graft' // ts/js に対し、<name>.bin ＋それを復元するラッパーを書き出す。true/'v8' = v8.serialize（Node 専用）、'graft' = greft-codec（クロス言語）。json では無視
  portable?: boolean               // outputAsync 専用: ts/js にクロスランタイムな式をインライン。File/Blob/FormData・循環対応。Symbol 不可。json では無視
}
```

### 出力形式

| 拡張子 | 形式 | 特殊型の扱い |
|--------|------|-------------|
| `.ts` / `.js` | `export const <exportName> = ...` | Date, BigInt, Map, Set, Symbol, File, Blob を正確にシリアライズ |
| `.ts` / `.js` + `binary: true` / `'v8'` | ESM ラッパー + 同名 `.bin`（v8 structured clone）| Date, Map, Set, RegExp, BigInt, TypedArray, `undefined`, 循環参照を保持。エクスポートは `unknown` 型なので、消費側でキャストするか `deserialize<T>()` を直接使用。Node.js 限定、追加の実行時依存なし |
| `.ts` / `.js` + `binary: 'graft'` | ESM ラッパー + 同名 `.bin`（greft-codec）| 上記 **＋** Symbol, `NaN`/`Infinity`, 共有参照。`.bin` はクロス言語（任意の JS ランタイム、さらに Python / Rust / Go などのポートでデコード可）。ラッパーは `greft-codec` から `decode` を import するため、消費側にこのパッケージが必要 |
| `.ts` / `.js` + `portable: true`（**`outputAsync`**）| `export const <name> = <seroval 式>` をインライン | クロスランタイム（Node↔ブラウザ）、sibling ファイル・consumer 依存なし。File/Blob/FormData の**中身**、Date, Map, Set, BigInt, TypedArray, 循環/共有参照を保持。**`Symbol` 不可。** |
| `.json` | JSON | Date は ISO文字列、BigInt は文字列化、Map/Set/Symbol は情報損失（警告あり）。`binary` は無視 |

::: warning JSON 出力時のデータ損失
JSON では表現できない型（BigInt, Symbol, Map, Set, File, Blob）を含むデータを `.json` で出力すると、データの正確性が失われます。警告メッセージが出力されるので、`.ts` / `.js`（必要に応じて `binary: true`）の使用を検討してください。
:::

::: info `binary`（完全な round-trip）
`binary: true`（`'v8'`）または `binary: 'graft'` を指定すると、`output()` は 2 つのファイルを書き出します:

- `<name>.bin` — バイナリ本体。`true`/`'v8'` は Node の `v8.serialize`（Node 専用）、`'graft'` は任意の JS ランタイム（さらに Python / Rust / Go などのポート）でデコードできる [greft-codec](https://github.com/Gityosan/greft) のバイト列です。どちらも Zod が生成するあらゆる値（循環参照を含む）を完全に保持し、`'graft'` は加えて `Symbol` と `NaN`/`Infinity` も保持します
- `<name>.ts` / `<name>.js` — import 時に同名の `.bin` を遅延復元する薄い ESM ラッパー（`'v8'` は `v8.deserialize`、`'graft'` は greft-codec の `decode`）。消費側は `import { mockData } from './user'` でそのまま使える

`'graft'` の場合、ラッパーは greft-codec（依存ゼロのパッケージ）から `decode` を import するため、生成モジュールの消費側にこのパッケージが必要です。エクスポート値は `unknown` 型なので、消費側でキャストするか、ラッパーを介さず `deserialize<T>('./user.bin')` / `deserializeGraft<T>('./user.bin')` を直接呼んで型付けしてください。`.bin` のファイル名は常にラッパーのベース名から自動導出され、個別には変更できません。ラッパーは ESM (`import.meta.dirname`) 前提で Node.js 20.11+ が必要です。
:::

## outputAsync

```ts
outputAsync(data: unknown, options?: OutputOptions): Promise<string>
```

`output` の非同期版です。`{ portable: true }` に必要で、`File`/`Blob`/`FormData` のバイトを非同期に読み出します。portable 以外（`json` / `ts` / `js` / `binary`）は `output` と同じ挙動で、書き込みのみ非同期 fs を使います。出力パスを返します。

`portable: true`（ts/js）では、自己完結したクロスランタイムな式 — `export const <name> = <seroval 式>` — をインライン出力します。素の `import` で**あらゆる JS ランタイム**（Node↔ブラウザ）で復元できます。`binary`（同名 `.bin` を書き出す）と違い、**sibling ファイルが不要**で、`File`/`Blob`/`FormData` は**中身ごと**往復し、Date・Map・Set・BigInt・TypedArray・循環/共有参照も保持します。

```ts
const data = generator.generate(schema)

// クロスランタイムで無損失なフィクスチャ（File/Blob の中身を含む）
const path = await generator.outputAsync(data, {
  path: './mocks/user.ts',
  portable: true,
})
// どこでも: import { mockData } from './mocks/user'
```

::: warning portable 出力では Symbol 非対応
素の `import` には unbox 工程が無いため、`portable: true` は **`Symbol` を拒否**します（plain object として復元されてしまうため）。Symbol を含むデータは `portable` なしの `ext: 'ts'`/`'js'`（`Symbol(...)` リテラルを出力）か、`serializePortable` / `deserializePortable` の文字列ペアを使ってください。sync の `output()` に `portable` を渡すと throw します — `outputAsync` を使ってください。
:::
