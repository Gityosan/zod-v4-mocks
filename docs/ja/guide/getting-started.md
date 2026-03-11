# はじめに

## zod-v4-mocks とは

Zod v4 スキーマからモックデータを自動生成するライブラリです。テスト・開発・プロトタイピングにおいて、スキーマ定義からリアルなダミーデータを即座に生成できます。

内部では [@faker-js/faker](https://fakerjs.dev/) を使用しており、メールアドレス・URL・UUID などのフォーマットに準拠したデータが生成されます。

::: tip Zod v3 (v4 preview) をお使いの場合
`zod@3.25.76` で `import from 'zod/v4'` を使用している場合は [zod-v4-preview-mocks](https://www.npmjs.com/package/zod-v4-preview-mocks) を使用してください。
:::

## インストール

::: code-group
```bash [npm]
npm install zod-v4-mocks
```
```bash [pnpm]
pnpm add zod-v4-mocks
```
```bash [yarn]
yarn add zod-v4-mocks
```
:::

**必要条件**: Zod v4.0.0 以上、Node.js 18 以上

## 基本的な使い方

```ts
import { z } from 'zod'
import { initGenerator } from 'zod-v4-mocks'

const schema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
  age: z.number().min(18).max(120).optional(),
  isActive: z.boolean(),
  tags: z.array(z.string()),
  createdAt: z.date(),
})

const generator = initGenerator({ seed: 1 })
const mockUser = generator.generate(schema)
console.log(mockUser)
// => { id: "08e93b6a-...", name: "subito", email: "Dion59@gmail.com", ... }
```

生成された値は基本的にスキーマのバリデーションを通ります:

```ts
schema.parse(mockUser) // OK - バリデーション成功
```

## 複数のモックを一括生成

`multiGenerate` を使うと、複数のスキーマからまとめてモックデータを生成できます。

```ts
const userSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
})

const postSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  body: z.string(),
  published: z.boolean(),
})

const generator = initGenerator({ seed: 1 })
const mocks = generator.multiGenerate({
  user: userSchema,
  post: postSchema,
})

console.log(mocks.user) // { id: "...", name: "...", email: "..." }
console.log(mocks.post) // { id: 123, title: "...", body: "...", published: true }
```

## 再現性のある生成

同じ `seed` 値を指定すれば、毎回同じモックデータが生成されます。テストの安定性に有用です。

```ts
const gen1 = initGenerator({ seed: 42 })
const gen2 = initGenerator({ seed: 42 })

const schema = z.string()
gen1.generate(schema) === gen2.generate(schema) // true
```

::: tip 再現性を保つためのヒント
`override` でカスタムジェネレータを定義する場合は、`Math.random()` や `Date.now()` ではなく、引数で渡される `options.faker` を使用してください。`faker` インスタンスは seed に基づいた RNG を使用しています。
:::

## 複雑なスキーマ

ネストしたオブジェクト、配列、レコード、ユニオンなど、複雑なスキーマにも対応しています。

```ts
const complexSchema = z.object({
  user: z.object({
    profile: z.object({
      name: z.string(),
      bio: z.string().optional(),
    }),
    preferences: z.object({
      theme: z.enum(['light', 'dark', 'auto']),
      notifications: z.boolean().default(true),
    }),
  }),
  posts: z.array(
    z.object({
      title: z.string(),
      content: z.string(),
      publishedAt: z.date().nullable(),
      tags: z.array(z.string()),
    }),
  ),
  metadata: z.record(
    z.string(),
    z.union([z.string(), z.number(), z.boolean()]),
  ),
})

const mock = initGenerator().generate(complexSchema)
```

## 対応スキーマ

### 完全対応

| カテゴリ | スキーマ |
|---------|---------|
| **プリミティブ** | string, number, boolean, bigint, date, null, undefined, void, any, unknown, NaN, symbol |
| **文字列フォーマット** | email, URL, UUID (v1〜v8), GUID, NanoID, ULID, CUID, CUID2, XID, KSUID, JWT, emoji, IPv4, IPv6, CIDRv4, CIDRv6, Base64, Base64URL, E164, hostname, datetime, isodate, isotime, isoduration |
| **コレクション** | object, array, tuple, record, map, set |
| **複合型** | union, discriminatedUnion, intersection (同型), xor |
| **修飾子** | optional, exactOptional, nullable, nonoptional, readonly, default, prefault |
| **その他** | enum, literal, templateLiteral, lazy, pipe, codec, catch, success, file |

### 部分対応

| スキーマ | 注意点 |
|---------|--------|
| `z.lazy()` | 深さ制限あり（デフォルト5階層）。トップレベル `union` でエラーの可能性 |
| `z.intersection()` | 同型同士は対応。異なる型同士は原則非対応（object+record、array+tuple は例外） |
| `.refine()` | バリデーション条件は無視される |
| `.check()` | `z.overwrite()` / `z.trim()` のみ対応。`z.regex()` / `z.minLength()` 等は非対応（メソッド形式 `.regex()` は対応済み） |

### 非対応

| スキーマ | 理由 |
|---------|------|
| `z.custom()` / `z.instanceof()` | カスタムバリデーション解析不可。`override` で回避 |
| `z.function()` | 関数のモック生成は複雑 |
| `.catchall()` | 無視される（モック生成に影響なし） |
| `z.nativeEnum()` | Zod v4 で非推奨。`z.enum()` を使用 |

## 次のステップ

- [設定](/ja/guide/configuration) - MockConfig の全オプション
- [カスタムジェネレータ](/ja/guide/custom-generator) - supply / override / register の使い方
- [API リファレンス](/ja/api/) - 全メソッドの詳細
- [Playground](/ja/playground/) - ブラウザで試す
