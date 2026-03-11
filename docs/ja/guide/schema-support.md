# スキーマ対応状況

zod-v4-mocks が対応しているZodスキーマの一覧です。

## 基本型（Primitives）

| メソッド      | 対応状況    | 注意点                                                               |
| ------------- | ----------- | -------------------------------------------------------------------- |
| `string()`    | ✅ 完全対応 | min/max/regex/startsWith/endsWith/includes/trim 等対応               |
| `number()`    | ✅ 完全対応 | min/max/int/float 対応                                               |
| `bigint()`    | ✅ 完全対応 | min/max 対応                                                         |
| `boolean()`   | ✅ 完全対応 | -                                                                    |
| `date()`      | ✅ 完全対応 | -                                                                    |
| `null()`      | ✅ 完全対応 | -                                                                    |
| `undefined()` | ✅ 完全対応 | -                                                                    |
| `void()`      | ✅ 完全対応 | -                                                                    |
| `any()`       | ✅ 対応     | 文字列を生成                                                         |
| `unknown()`   | ✅ 対応     | 文字列を生成                                                         |
| `nan()`       | ✅ 完全対応 | -                                                                    |
| `symbol()`    | ✅ 完全対応 | -                                                                    |
| `never()`     | ⚠️ 特殊対応 | 内部的にスキップされる（配列では要素除外、オブジェクトではキー省略） |

## コレクション型

| メソッド          | 対応状況    | 注意点                        |
| ----------------- | ----------- | ----------------------------- |
| `object()`        | ✅ 完全対応 | ネスト対応                    |
| `array()`         | ✅ 完全対応 | min/max/nonempty/length 対応  |
| `tuple()`         | ✅ 完全対応 | 各要素の型を保持              |
| `record()`        | ✅ 完全対応 | エントリ数設定可能            |
| `partialRecord()` | ✅ 完全対応 | [詳細](#partialrecord-と-zodnever) |
| `map()`           | ✅ 完全対応 | min/max/nonempty 対応               |
| `set()`           | ✅ 完全対応 | min/max/nonempty 対応               |

### partialRecord と ZodNever

`partialRecord()` は内部的に `record()` と同じ生成ロジックを使用しています。Zod は `partialRecord(keys, value)` を内部的に値の型を `union([value, never()])` に変換するため、生成時に `never()` が選ばれたエントリは自動的にスキップされます。

```ts
const schema = z.partialRecord(z.enum(['id', 'name', 'email']), z.string());

const mock = generator.generate(schema);
// => { id: "subito" } （一部のキーだけが含まれる）
// => {} （空オブジェクトになる場合もある）

schema.parse(mock); // OK - すべてのキーはオプショナル
```

これにより、`record()` とは異なり一部のキーのみを持つオブジェクトが自然に生成されます。`record` の `min`/`max` 設定はエントリ生成の試行回数に影響しますが、`ZodNever` によるスキップが発生するため、実際のキー数はそれより少なくなることがあります。

## ユニオン・交差型

| メソッド               | 対応状況    | 注意点                          |
| ---------------------- | ----------- | ------------------------------- |
| `union()`              | ✅ 完全対応 | 均等に選択                      |
| `discriminatedUnion()` | ✅ 対応     | 均等に選択                      |
| `xor()`                | ✅ 完全対応 | 排他的ユニオン                  |
| `intersection()`       | ⚠️ 部分対応 | [詳細](#zodintersection-交差型) |

## リテラル・列挙型

| メソッド            | 対応状況    | 注意点                                                                      |
| ------------------- | ----------- | --------------------------------------------------------------------------- |
| `literal()`         | ✅ 完全対応 | -                                                                           |
| `enum()`            | ✅ 完全対応 | -                                                                           |
| `templateLiteral()` | ✅ 完全対応 | string/number/boolean/literal/union/null/undefined/nullable/optional に対応 |

### templateLiteral の注意点

`z.undefined()` を含む `templateLiteral` では、Zod が期待する値に注意してください。

```ts
const schema = z.templateLiteral(['Value: ', z.undefined()]);
type Schema = z.infer<typeof schema>;
// TypeScript は `"Value: "` と推論するが、
// Zod は `"Value: undefined"` を期待する

const mock = generator.generate(schema);
// => "Value: undefined"（Zod の挙動に従う）
```

## 日時フォーマット

| メソッド                     | 対応状況    | 形式              |
| ---------------------------- | ----------- | ----------------- |
| `datetime()`                 | ✅ 完全対応 | ISO 8601          |
| `isodate()`                  | ✅ 完全対応 | YYYY-MM-DD        |
| `isotime()`                  | ✅ 完全対応 | HH:MM:SS          |
| `isoduration()`              | ✅ 完全対応 | ISO 8601 Duration |

## 文字列フォーマット

| メソッド                   | 対応状況              |
| -------------------------- | --------------------- |
| `email()`                  | ✅ 完全対応           |
| `url()`                    | ✅ 完全対応           |
| `uuid()`                   | ✅ 完全対応（v1〜v8） |
| `guid()`                   | ✅ 完全対応           |
| `nanoid()`                 | ✅ 完全対応           |
| `ulid()`                   | ✅ 完全対応           |
| `cuid()` / `cuid2()`       | ✅ 完全対応           |
| `xid()` / `ksuid()`        | ✅ 完全対応           |
| `jwt()`                    | ✅ 完全対応           |
| `emoji()`                  | ✅ 完全対応           |
| `ipv4()` / `ipv6()`        | ✅ 完全対応           |
| `cidrv4()` / `cidrv6()`    | ✅ 完全対応           |
| `base64()` / `base64url()` | ✅ 完全対応           |
| `e164()`                   | ✅ 完全対応           |
| `hostname()`               | ✅ 完全対応           |

## 文字列の制約対応

文字列スキーマでは、メソッド形式の制約が豊富に対応しています。

| 制約       | 例                                      | 対応 |
| ---------- | --------------------------------------- | ---- |
| 長さ       | `length(10)`, `min(5)`, `max(20)`       | ✅   |
| 正規表現   | `regex(/^[A-Z]+$/)`                     | ✅   |
| 前方一致   | `startsWith('PREFIX')`                  | ✅   |
| 後方一致   | `endsWith('SUFFIX')`                    | ✅   |
| 含む       | `includes('KEYWORD')`                   | ✅   |
| 大文字変換 | `toUpperCase()`, `uppercase()`          | ✅   |
| 小文字変換 | `toLowerCase()`, `lowercase()`          | ✅   |
| トリム     | `trim()`                                | ✅   |
| 正規化     | `normalize()`                           | ✅   |
| Slugify    | `slugify()`                             | ✅   |

複数の制約を組み合わせることも可能です:

```ts
const schema = z
  .string()
  .min(10)
  .max(30)
  .startsWith('PRE')
  .includes('X')
  .toLowerCase();

const mock = generator.generate(schema);
// => "prexqwerty..." (10-30文字、"PRE"で開始、"X"を含む、小文字)
```

::: warning 制約の組み合わせに関する注意
一部の組み合わせは矛盾する場合があります（例: `regex(/^[a-z]+$/)` と `toUpperCase()`）。矛盾する制約を指定した場合、バリデーションに失敗する値が生成される可能性があります。
:::

## Effects・Pipeline

| メソッド       | 対応状況    | 注意点                               |
| -------------- | ----------- | ------------------------------------ |
| `transform()`  | ✅ 完全対応 | transform が適用される               |
| `preprocess()` | ✅ 完全対応 | -                                    |
| `pipe()`       | ✅ 完全対応 | out スキーマから生成                 |
| `codec()`      | ✅ 対応     | stringbool 等に対応                  |
| `brand()`      | ✅ 対応     | 型レベルのみ（ランタイムに影響なし） |
| `refine()`     | ⚠️ 制約無視 | [詳細](#refine-検証)                 |
| `check()`      | ⚠️ 部分対応 | [詳細](#check-検証チェック)          |

## 特殊型

| メソッド    | 対応状況    | 注意点                       |
| ----------- | ----------- | ---------------------------- |
| `lazy()`    | ⚠️ 部分対応 | [詳細](#zodlazy-再帰型)      |
| `success()` | ✅ 対応     | -                            |
| `catch()`   | ✅ 対応     | -                            |
| `file()`    | ✅ 対応     | 空の test.txt ファイルを生成 |
| `apply()`   | ✅ 対応     | スキーマ変換ヘルパー         |

## 修飾子

| メソッド          | 対応状況    | 注意点                               |
| ----------------- | ----------- | ------------------------------------ |
| `optional()`      | ✅ 完全対応 | `optionalProbability` で制御         |
| `exactOptional()` | ✅ 完全対応 | キーごと省略（`undefined` ではない） |
| `nullable()`      | ✅ 完全対応 | `nullableProbability` で制御         |
| `default()`       | ✅ 完全対応 | `defaultProbability` で制御          |
| `prefault()`      | ✅ 完全対応 | `defaultProbability` で制御          |
| `nonoptional()`   | ✅ 完全対応 | optional 解除                        |
| `readonly()`      | ✅ 完全対応 | 型レベルのみ                         |

## 部分対応の詳細

### ZodIntersection（交差型）

**対応状況**: ⚠️ 部分対応

同じ型同士の交差は基本的にサポートされますが、異なる型同士の交差は限定的です。

#### 動作する例

```ts
// オブジェクト同士の交差
const schema = z.intersection(
  z.object({ a: z.string() }),
  z.object({ b: z.number() }),
);
// => { a: "subito", b: 123 }

// 数値範囲の交差
const rangeSchema = z.intersection(
  z.number().min(0).max(100),
  z.number().min(50).max(150),
);
// => 50〜100 の数値
```

#### 制約

- 同じ型同士の交差は基本サポート
- **異なる型同士は原則非対応**（以下は例外的に対応）:
  - `ZodObject` と `ZodRecord`
  - `ZodArray` と `ZodTuple`
- 一方が `ZodAny` / `ZodUnknown` の場合、もう一方の型が使用される
- Map/Set/Array/Enum/Union の要素に互換性がない場合はエラー

### ZodLazy（再帰型）

**対応状況**: ⚠️ 部分対応

再帰的なスキーマに対応していますが、深さ制限があります。ゲッターベースの循環参照も同様に対応しています。

#### 動作する例

```ts
// z.lazy() による自己参照
type Category = {
  name: string;
  subcategories: Category[];
};

const categorySchema: z.ZodType<Category> = z.lazy(() =>
  z.object({
    name: z.string(),
    subcategories: z.array(categorySchema),
  }),
);

// ゲッターによる自己参照（Zod v4 推奨パターン）
const Node = z.object({
  value: z.number(),
  get next() {
    return Node.optional();
  },
});

// 相互参照
const User = z.object({
  email: z.email(),
  get posts() {
    return z.array(Post);
  },
});

const Post = z.object({
  title: z.string(),
  get author() {
    return User;
  },
});
```

#### 制約

- 深さ制限あり（デフォルト: 5階層、`recursiveDepthLimit` で変更可能）
- 深さの上限に達すると空のオブジェクト `{}` が返される
- トップレベルに `union` がある場合はエラーの可能性
- `z.lazy()` とゲッターは同じ深さに到達することが保証されている

```ts
const gen = initGenerator({ recursiveDepthLimit: 3 });
const result = gen.generate(categorySchema);
// 3階層で打ち切り
```

### refine()（検証）

**対応状況**: ⚠️ 制約無視

`refine()` の検証条件はモック生成時に**無視**されます。

```ts
const schema = z.number().refine((val) => val > 0, {
  message: 'Must be positive',
});

const mock = generator.generate(schema);
// => 数値が生成されるが、> 0 は保証されない
```

回避策として `override` で条件を満たす値を生成できます。

### check()（検証チェック）

**対応状況**: ⚠️ 部分対応

`check()` 関数経由のバリデーションは `z.overwrite()` / `z.trim()` / `z.toLowerCase()` / `z.toUpperCase()` 等の**変換系チェックのみ**対応しています。

| API                                    | 対応状況  | 備考                 |
| -------------------------------------- | --------- | -------------------- |
| `regex(/pattern/)`                     | ✅ 対応   | メソッド形式（推奨） |
| `check(z.regex(/pattern/))`           | ❌ 非対応 | `check()` 関数経由   |
| `trim()`                               | ✅ 対応   | メソッド形式（推奨） |
| `check(z.trim())`                     | ✅ 対応   | overwrite ヘルパー   |
| `check(z.overwrite(...))`             | ✅ 対応   | 変換が適用される     |
| `check(z.minLength(...))`             | ❌ 非対応 | -                    |
| `with(z.minLength(5), z.toLowerCase())`| ✅ 対応  | `check()` と同等     |

::: tip 推奨
バリデーション系は**メソッド形式**（`regex()`, `min()`, `max()` 等）を使用してください。メソッド形式はすべて対応しています。
:::

---

## 非対応

| スキーマ                    | 理由                               | 回避策                        |
| --------------------------- | ---------------------------------- | ----------------------------- |
| `custom()` / `instanceof()` | カスタムバリデーション解析不可     | `override` で値を提供         |
| `function()`                | 関数のモック生成は複雑             | `override` でモック関数を提供 |
| `nativeEnum()`              | Zod v4 で非推奨                    | `enum()` を使用               |
| `catchall()`                | 無視される（モック生成に影響なし） | -                             |

### 非対応スキーマの回避例

```ts
// z.custom() の回避策
const myCustomSchema = z.custom<MyClass>((val) => val instanceof MyClass);

const mock = initGenerator()
  .override((schema) => {
    if (schema === myCustomSchema) {
      return new MyClass();
    }
  })
  .generate(myCustomSchema);
```

```ts
// z.function() の回避策
const fnSchema = z.function().args(z.string()).returns(z.boolean());

const mock = initGenerator()
  .override((schema) => {
    if (schema instanceof z.ZodFunction) {
      return (str: string) => str.length > 0;
    }
  })
  .generate(fnSchema);
```
