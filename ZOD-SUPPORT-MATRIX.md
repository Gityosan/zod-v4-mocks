# Zod v4 対応表

zod-v4-mocks での Zod v4.3.5 メソッド・クラスの対応状況

## 凡例

- ✅ 対応済み
- ⚠️ 部分対応 / 既存機能で動作
- ❌ 未対応
- ➖ 対応不要（モック生成に関係なし）

---

## スキーマタイプ (Schema Types)

### プリミティブ型

| メソッド | クラス | 対応 | 備考 |
|---------|--------|------|------|
| `z.string()` | `ZodString` | ✅ | minLength/maxLength対応 |
| `z.number()` | `ZodNumber` | ✅ | min/max対応 |
| `z.bigint()` | `ZodBigInt` | ✅ | min/max対応 |
| `z.boolean()` | `ZodBoolean` | ✅ | |
| `z.date()` | `ZodDate` | ✅ | |
| `z.symbol()` | `ZodSymbol` | ✅ | |
| `z.null()` | `ZodNull` | ✅ | |
| `z.undefined()` | `ZodUndefined` | ✅ | |
| `z.void()` | `ZodVoid` | ✅ | |
| `z.any()` | `ZodAny` | ✅ | ランダム文字列を返す |
| `z.unknown()` | `ZodUnknown` | ✅ | ランダム文字列を返す |
| `z.never()` | `ZodNever` | ✅ | 警告を出してnullを返す |
| `z.nan()` | `ZodNaN` | ✅ | |

### 数値フォーマット

| メソッド | クラス | 対応 | 備考 |
|---------|--------|------|------|
| `z.int()` | `ZodNumber` | ✅ | |
| `z.float32()` | `ZodFloat32` | ✅ | |
| `z.float64()` | `ZodFloat64` | ✅ | |
| `z.int32()` | `ZodInt32` | ✅ | |
| `z.uint32()` | `ZodUInt32` | ✅ | |
| `z.int64()` | `ZodInt64` | ✅ | bigint |
| `z.uint64()` | `ZodUInt64` | ✅ | bigint |

### 文字列フォーマット

| メソッド | クラス | 対応 | 備考 |
|---------|--------|------|------|
| `z.email()` | `ZodEmail` | ✅ | |
| `z.url()` | `ZodURL` | ✅ | |
| `z.httpUrl()` | `ZodHTTPURL` | ✅ | |
| `z.uuid()` | `ZodUUID` | ✅ | v4/v6/v7対応 |
| `z.uuidv4()` | `ZodUUID` | ✅ | |
| `z.uuidv6()` | `ZodUUID` | ✅ | regex生成 |
| `z.uuidv7()` | `ZodUUID` | ✅ | regex生成 |
| `z.guid()` | `ZodGUID` | ✅ | |
| `z.nanoid()` | `ZodNanoID` | ✅ | |
| `z.cuid()` | `ZodCUID` | ✅ | regex生成 |
| `z.cuid2()` | `ZodCUID2` | ✅ | regex生成 |
| `z.ulid()` | `ZodULID` | ✅ | |
| `z.xid()` | `ZodXID` | ✅ | regex生成 |
| `z.ksuid()` | `ZodKSUID` | ✅ | regex生成 |
| `z.ipv4()` | `ZodIPv4` | ✅ | |
| `z.ipv6()` | `ZodIPv6` | ✅ | |
| `z.cidrv4()` | `ZodCIDRv4` | ✅ | regex生成 |
| `z.cidrv6()` | `ZodCIDRv6` | ✅ | |
| `z.mac()` | `ZodMAC` | ⚠️ | regex生成（formatによる） |
| `z.base64()` | `ZodBase64` | ✅ | regex生成 |
| `z.base64url()` | `ZodBase64URL` | ✅ | |
| `z.e164()` | `ZodE164` | ✅ | regex生成 |
| `z.jwt()` | `ZodJWT` | ✅ | |
| `z.emoji()` | `ZodEmoji` | ✅ | |
| `z.hostname()` | `ZodHostname` | ✅ | |
| `z.hex()` | - | ✅ | regex生成 |
| `z.hash()` | - | ✅ | regex生成 (md5, sha256等) |
| `z.iso.datetime()` | `ZodISODateTime` | ✅ | |
| `z.iso.date()` | `ZodISODate` | ✅ | |
| `z.iso.time()` | `ZodISOTime` | ✅ | |
| `z.iso.duration()` | `ZodISODuration` | ✅ | |

### コレクション型

| メソッド | クラス | 対応 | 備考 |
|---------|--------|------|------|
| `z.array()` | `ZodArray` | ✅ | min/max設定可能 |
| `z.tuple()` | `ZodTuple` | ✅ | |
| `z.object()` | `ZodObject` | ✅ | |
| `z.strictObject()` | `ZodObject` | ✅ | objectと同様 |
| `z.looseObject()` | `ZodObject` | ✅ | objectと同様 |
| `z.record()` | `ZodRecord` | ✅ | min/max設定可能 |
| `z.partialRecord()` | `ZodRecord` | ⚠️ | recordと同様に動作 |
| `z.looseRecord()` | `ZodRecord` | ⚠️ | recordと同様に動作 |
| `z.map()` | `ZodMap` | ✅ | min/max設定可能 |
| `z.set()` | `ZodSet` | ✅ | min/max設定可能 |

### 合成型

| メソッド | クラス | 対応 | 備考 |
|---------|--------|------|------|
| `z.union()` | `ZodUnion` | ✅ | ランダム選択 |
| `z.discriminatedUnion()` | `ZodDiscriminatedUnion` | ✅ | ランダム選択 |
| `z.xor()` | `ZodXor` | ✅ | 排他性検証あり |
| `z.intersection()` | `ZodIntersection` | ✅ | 型マージ対応 |
| `z.literal()` | `ZodLiteral` | ✅ | |
| `z.enum()` | `ZodEnum` | ✅ | ランダム選択 |
| `z.nativeEnum()` | `ZodNativeEnum` | ⚠️ | enumと同様 |
| `z.templateLiteral()` | `ZodTemplateLiteral` | ✅ | |

### ラッパー型

| メソッド | クラス | 対応 | 備考 |
|---------|--------|------|------|
| `.optional()` | `ZodOptional` | ✅ | 確率でundefined |
| `.exactOptional()` | `ZodExactOptional` | ✅ | 確率でキー省略 |
| `.nullable()` | `ZodNullable` | ✅ | 確率でnull |
| `.nullish()` | - | ✅ | optional + nullable |
| `.nonoptional()` | `ZodNonOptional` | ✅ | |
| `.default()` | `ZodDefault` | ✅ | デフォルト値を返す |
| `.prefault()` | `ZodPrefault` | ✅ | デフォルト値を返す |
| `.readonly()` | `ZodReadonly` | ✅ | 内部型を生成 |
| `.catch()` | `ZodCatch` | ✅ | |
| `z.lazy()` | `ZodLazy` | ✅ | 再帰深度制限あり |

### パイプライン・変換

| メソッド | クラス | 対応 | 備考 |
|---------|--------|------|------|
| `z.pipe()` | `ZodPipe` | ✅ | |
| `z.codec()` | `ZodCodec` | ✅ | stringbool対応 |
| `z.transform()` | `ZodTransform` | ⚠️ | pipe経由で対応 |
| `z.preprocess()` | - | ⚠️ | pipe経由で対応 |
| `z.success()` | `ZodSuccess` | ✅ | |

### その他

| メソッド | クラス | 対応 | 備考 |
|---------|--------|------|------|
| `z.file()` | `ZodFile` | ✅ | 空のFileオブジェクト |
| `z.json()` | - | ✅ | 空オブジェクトを返す |
| `z.promise()` | `ZodPromise` | ❌ | |
| `z.function()` | `ZodFunction` | ❌ | |
| `z.custom()` | `ZodCustom` | ❌ | |
| `z.fromJSONSchema()` | `ZodJSONSchema` | ❌ | |

---

## チェック・変換メソッド (Checks & Transforms)

### 文字列チェック

| メソッド | 対応 | 備考 |
|---------|------|------|
| `.min()` / `.minLength()` | ✅ | 生成文字列長に反映 |
| `.max()` / `.maxLength()` | ✅ | 生成文字列長に反映 |
| `.length()` | ✅ | |
| `.regex()` | ✅ | RandExpで生成 |
| `.includes()` | ⚠️ | 検証のみ |
| `.startsWith()` | ⚠️ | 検証のみ |
| `.endsWith()` | ⚠️ | 検証のみ |
| `.nonempty()` | ✅ | min(1)と同等 |

### 文字列変換 (overwrite)

| メソッド | 対応 | 備考 |
|---------|------|------|
| `.trim()` | ✅ | 生成後に適用 |
| `.toLowerCase()` | ✅ | 生成後に適用 |
| `.toUpperCase()` | ✅ | 生成後に適用 |
| `.normalize()` | ✅ | 生成後に適用 |
| `.slugify()` | ✅ | 生成後に適用 |

### 数値チェック

| メソッド | 対応 | 備考 |
|---------|------|------|
| `.min()` / `.gte()` | ✅ | |
| `.max()` / `.lte()` | ✅ | |
| `.gt()` | ✅ | |
| `.lt()` | ✅ | |
| `.positive()` | ✅ | |
| `.negative()` | ✅ | |
| `.nonnegative()` | ✅ | |
| `.nonpositive()` | ✅ | |
| `.multipleOf()` | ⚠️ | 検証のみ |
| `.finite()` | ✅ | |
| `.safe()` | ✅ | |

### 配列チェック

| メソッド | 対応 | 備考 |
|---------|------|------|
| `.min()` | ⚠️ | config.arrayで設定 |
| `.max()` | ⚠️ | config.arrayで設定 |
| `.length()` | ⚠️ | config.arrayで設定 |
| `.nonempty()` | ⚠️ | config.arrayで設定 |

---

## スキーマメソッド (Schema Methods)

| メソッド | 対応 | 備考 |
|---------|------|------|
| `.check()` | ✅ | checksに追加される |
| `.with()` | ✅ | check()のエイリアス |
| `.apply()` | ✅ | 変換後のスキーマを処理 |
| `.refine()` | ➖ | 検証のみ |
| `.superRefine()` | ➖ | 検証のみ |
| `.parse()` | ➖ | 検証用 |
| `.safeParse()` | ➖ | 検証用 |
| `.meta()` | ✅ | consistentKey対応 |
| `.describe()` | ➖ | メタデータのみ |
| `.brand()` | ➖ | 型のみ |

---

## オブジェクトメソッド

| メソッド | 対応 | 備考 |
|---------|------|------|
| `.extend()` | ✅ | ZodObjectとして処理 |
| `.merge()` | ✅ | ZodObjectとして処理 |
| `.pick()` | ✅ | ZodObjectとして処理 |
| `.omit()` | ✅ | ZodObjectとして処理 |
| `.partial()` | ✅ | ZodOptionalとして処理 |
| `.required()` | ✅ | ZodNonOptionalとして処理 |
| `.passthrough()` | ✅ | ZodObjectとして処理 |
| `.strict()` | ✅ | ZodObjectとして処理 |
| `.strip()` | ✅ | ZodObjectとして処理 |
| `.keyof()` | ⚠️ | enumとして処理 |

---

## 設定オプション (MockConfig)

| オプション | 説明 | デフォルト |
|-----------|------|-----------|
| `seed` | 乱数シード | `1` |
| `locale` | Fakerロケール | `['en', 'base']` |
| `array` | 配列長 {min, max} | `{min: 1, max: 3}` |
| `map` | Map長 {min, max} | `{min: 1, max: 3}` |
| `set` | Set長 {min, max} | `{min: 1, max: 3}` |
| `record` | Record長 {min, max} | `{min: 1, max: 3}` |
| `optionalProbability` | optional時のundefined確率 | `0.5` |
| `nullableProbability` | nullable時のnull確率 | `0.5` |
| `defaultProbability` | default使用確率 | `0.5` |
| `lazyDepthLimit` | lazy再帰制限 | `5` |
| `consistentKey` | 一貫性生成用metaキー | `undefined` |

---

## 更新履歴

- **v1.0.15** - Zod 4.3.5対応
  - `z.xor()` サポート追加（排他性検証あり）
  - `z.exactOptional()` サポート追加
  - `.slugify()` サポート確認
  - `.with()` / `.check()` サポート確認
  - `.apply()` サポート確認
