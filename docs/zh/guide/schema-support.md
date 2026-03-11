# Schema 支持情况

以下是 zod-v4-mocks 所支持的 Zod Schema 列表。

## 基本类型（Primitives）

| 方法      | 支持状态    | 注意事项                                                               |
| ------------- | ----------- | -------------------------------------------------------------------- |
| `string()`    | ✅ 完全支持 | 支持 min/max/regex/startsWith/endsWith/includes/trim 等               |
| `number()`    | ✅ 完全支持 | 支持 min/max/int/float                                               |
| `bigint()`    | ✅ 完全支持 | 支持 min/max                                                         |
| `boolean()`   | ✅ 完全支持 | -                                                                    |
| `date()`      | ✅ 完全支持 | -                                                                    |
| `null()`      | ✅ 完全支持 | -                                                                    |
| `undefined()` | ✅ 完全支持 | -                                                                    |
| `void()`      | ✅ 完全支持 | -                                                                    |
| `any()`       | ✅ 支持     | 生成字符串                                                         |
| `unknown()`   | ✅ 支持     | 生成字符串                                                         |
| `nan()`       | ✅ 完全支持 | -                                                                    |
| `symbol()`    | ✅ 完全支持 | -                                                                    |
| `never()`     | ⚠️ 特殊处理 | 内部被跳过（数组中排除元素，对象中省略键） |

## 集合类型

| 方法          | 支持状态    | 注意事项                        |
| ----------------- | ----------- | ----------------------------- |
| `object()`        | ✅ 完全支持 | 支持嵌套                    |
| `array()`         | ✅ 完全支持 | 支持 min/max/nonempty/length  |
| `tuple()`         | ✅ 完全支持 | 保持各元素的类型              |
| `record()`        | ✅ 完全支持 | 可设置条目数            |
| `partialRecord()` | ✅ 完全支持 | [详情](#partialrecord-与-zodnever) |
| `map()`           | ✅ 完全支持 | 支持 min/max/nonempty               |
| `set()`           | ✅ 完全支持 | 支持 min/max/nonempty               |

### partialRecord 与 ZodNever

`partialRecord()` 内部使用与 `record()` 相同的生成逻辑。Zod 在内部将 `partialRecord(keys, value)` 的值类型转换为 `union([value, never()])`，因此生成时选中 `never()` 的条目会被自动跳过。

```ts
const schema = z.partialRecord(z.enum(['id', 'name', 'email']), z.string());

const mock = generator.generate(schema);
// => { id: "subito" } （仅包含部分键）
// => {} （也可能为空对象）

schema.parse(mock); // OK - 所有键都是可选的
```

因此，与 `record()` 不同，会自然地生成仅包含部分键的对象。`record` 的 `min`/`max` 设置影响条目生成的尝试次数，但由于 `ZodNever` 导致的跳过，实际的键数可能会更少。

## Union / 交叉类型

| 方法               | 支持状态    | 注意事项                          |
| ---------------------- | ----------- | ------------------------------- |
| `union()`              | ✅ 完全支持 | 均匀选择                      |
| `discriminatedUnion()` | ✅ 支持     | 均匀选择                      |
| `xor()`                | ✅ 完全支持 | 排他性 Union                  |
| `intersection()`       | ⚠️ 部分支持 | [详情](#zodintersection-交叉类型) |

## 字面量 / 枚举类型

| 方法            | 支持状态    | 注意事项                                                                      |
| ------------------- | ----------- | --------------------------------------------------------------------------- |
| `literal()`         | ✅ 完全支持 | -                                                                           |
| `enum()`            | ✅ 完全支持 | -                                                                           |
| `templateLiteral()` | ✅ 完全支持 | 支持 string/number/boolean/literal/union/null/undefined/nullable/optional |

### templateLiteral 的注意事项

在包含 `z.undefined()` 的 `templateLiteral` 中，请注意 Zod 期望的值。

```ts
const schema = z.templateLiteral(['Value: ', z.undefined()]);
type Schema = z.infer<typeof schema>;
// TypeScript 推断为 `"Value: "`，
// 但 Zod 期望 `"Value: undefined"`

const mock = generator.generate(schema);
// => "Value: undefined"（遵循 Zod 的行为）
```

## 日期时间格式

| 方法                     | 支持状态    | 格式              |
| ---------------------------- | ----------- | ----------------- |
| `datetime()`                 | ✅ 完全支持 | ISO 8601          |
| `isodate()`                  | ✅ 完全支持 | YYYY-MM-DD        |
| `isotime()`                  | ✅ 完全支持 | HH:MM:SS          |
| `isoduration()`              | ✅ 完全支持 | ISO 8601 Duration |

## 字符串格式

| 方法                   | 支持状态              |
| -------------------------- | --------------------- |
| `email()`                  | ✅ 完全支持           |
| `url()`                    | ✅ 完全支持           |
| `uuid()`                   | ✅ 完全支持（v1~v8） |
| `guid()`                   | ✅ 完全支持           |
| `nanoid()`                 | ✅ 完全支持           |
| `ulid()`                   | ✅ 完全支持           |
| `cuid()` / `cuid2()`       | ✅ 完全支持           |
| `xid()` / `ksuid()`        | ✅ 完全支持           |
| `jwt()`                    | ✅ 完全支持           |
| `emoji()`                  | ✅ 完全支持           |
| `ipv4()` / `ipv6()`        | ✅ 完全支持           |
| `cidrv4()` / `cidrv6()`    | ✅ 完全支持           |
| `base64()` / `base64url()` | ✅ 完全支持           |
| `e164()`                   | ✅ 完全支持           |
| `hostname()`               | ✅ 完全支持           |

## 字符串约束支持

字符串 Schema 丰富地支持方法形式的约束。

| 约束       | 示例                                      | 支持 |
| ---------- | --------------------------------------- | ---- |
| 长度       | `length(10)`, `min(5)`, `max(20)`       | ✅   |
| 正则表达式   | `regex(/^[A-Z]+$/)`                     | ✅   |
| 前缀匹配   | `startsWith('PREFIX')`                  | ✅   |
| 后缀匹配   | `endsWith('SUFFIX')`                    | ✅   |
| 包含       | `includes('KEYWORD')`                   | ✅   |
| 大写转换 | `toUpperCase()`, `uppercase()`          | ✅   |
| 小写转换 | `toLowerCase()`, `lowercase()`          | ✅   |
| 去除空白     | `trim()`                                | ✅   |
| 规范化     | `normalize()`                           | ✅   |
| Slugify    | `slugify()`                             | ✅   |

可以组合多个约束：

```ts
const schema = z
  .string()
  .min(10)
  .max(30)
  .startsWith('PRE')
  .includes('X')
  .toLowerCase();

const mock = generator.generate(schema);
// => "prexqwerty..." (10-30个字符，以"PRE"开头，包含"X"，小写)
```

::: warning 关于约束组合的注意事项
某些组合可能会产生矛盾（例如：`regex(/^[a-z]+$/)` 和 `toUpperCase()`）。指定矛盾的约束时，可能会生成无法通过验证的值。
:::

## Effects / Pipeline

| 方法       | 支持状态    | 注意事项                               |
| -------------- | ----------- | ------------------------------------ |
| `transform()`  | ✅ 完全支持 | transform 会被应用               |
| `preprocess()` | ✅ 完全支持 | -                                    |
| `pipe()`       | ✅ 完全支持 | 从 out Schema 生成                 |
| `codec()`      | ✅ 支持     | 支持 stringbool 等                  |
| `brand()`      | ✅ 支持     | 仅类型层面（对运行时无影响） |
| `refine()`     | ⚠️ 忽略约束 | [详情](#refine-验证)                 |
| `check()`      | ⚠️ 部分支持 | [详情](#check-验证检查)          |

## 特殊类型

| 方法    | 支持状态    | 注意事项                       |
| ----------- | ----------- | ---------------------------- |
| `lazy()`    | ⚠️ 部分支持 | [详情](#zodlazy-递归类型)      |
| `success()` | ✅ 支持     | -                            |
| `catch()`   | ✅ 支持     | -                            |
| `file()`    | ✅ 支持     | 生成空的 test.txt 文件 |
| `apply()`   | ✅ 支持     | Schema 转换辅助工具         |

## 修饰符

| 方法          | 支持状态    | 注意事项                               |
| ----------------- | ----------- | ------------------------------------ |
| `optional()`      | ✅ 完全支持 | 通过 `optionalProbability` 控制         |
| `exactOptional()` | ✅ 完全支持 | 整个键被省略（而非 `undefined`） |
| `nullable()`      | ✅ 完全支持 | 通过 `nullableProbability` 控制         |
| `default()`       | ✅ 完全支持 | 通过 `defaultProbability` 控制          |
| `prefault()`      | ✅ 完全支持 | 通过 `defaultProbability` 控制          |
| `nonoptional()`   | ✅ 完全支持 | 取消 optional                        |
| `readonly()`      | ✅ 完全支持 | 仅类型层面                         |

## 部分支持的详情

### ZodIntersection（交叉类型）

**支持状态**: ⚠️ 部分支持

同类型之间的交叉基本上是支持的，但不同类型之间的交叉支持有限。

#### 可正常工作的示例

```ts
// 对象之间的交叉
const schema = z.intersection(
  z.object({ a: z.string() }),
  z.object({ b: z.number() }),
);
// => { a: "subito", b: 123 }

// 数值范围的交叉
const rangeSchema = z.intersection(
  z.number().min(0).max(100),
  z.number().min(50).max(150),
);
// => 50~100 的数值
```

#### 限制

- 同类型之间的交叉基本支持
- **不同类型之间原则上不支持**（以下为例外情况）：
  - `ZodObject` 与 `ZodRecord`
  - `ZodArray` 与 `ZodTuple`
- 当一方为 `ZodAny` / `ZodUnknown` 时，使用另一方的类型
- 当 Map/Set/Array/Enum/Union 的元素不兼容时会报错

### ZodLazy（递归类型）

**支持状态**: ⚠️ 部分支持

支持递归 Schema，但有深度限制。基于 getter 的循环引用同样支持。

#### 可正常工作的示例

```ts
// 通过 z.lazy() 实现自引用
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

// 通过 getter 实现自引用（Zod v4 推荐模式）
const Node = z.object({
  value: z.number(),
  get next() {
    return Node.optional();
  },
});

// 相互引用
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

#### 限制

- 有深度限制（默认：5 层，可通过 `recursiveDepthLimit` 更改）
- 达到深度上限时返回空对象 `{}`
- 顶层存在 `union` 时可能会报错
- 保证 `z.lazy()` 和 getter 达到相同的深度

```ts
const gen = initGenerator({ recursiveDepthLimit: 3 });
const result = gen.generate(categorySchema);
// 在第 3 层截断
```

### refine()（验证）

**支持状态**: ⚠️ 忽略约束

`refine()` 的验证条件在 Mock 生成时会被**忽略**。

```ts
const schema = z.number().refine((val) => val > 0, {
  message: 'Must be positive',
});

const mock = generator.generate(schema);
// => 会生成数值，但不保证 > 0
```

作为替代方案，可以通过 `override` 生成满足条件的值。

### check()（验证检查）

**支持状态**: ⚠️ 部分支持

通过 `check()` 函数的验证仅支持 `z.overwrite()` / `z.trim()` / `z.toLowerCase()` / `z.toUpperCase()` 等**转换类检查**。

| API                                    | 支持状态  | 备注                 |
| -------------------------------------- | --------- | -------------------- |
| `regex(/pattern/)`                     | ✅ 支持   | 方法形式（推荐） |
| `check(z.regex(/pattern/))`           | ❌ 不支持 | 通过 `check()` 函数   |
| `trim()`                               | ✅ 支持   | 方法形式（推荐） |
| `check(z.trim())`                     | ✅ 支持   | overwrite 辅助工具   |
| `check(z.overwrite(...))`             | ✅ 支持   | 转换会被应用     |
| `check(z.minLength(...))`             | ❌ 不支持 | -                    |
| `with(z.minLength(5), z.toLowerCase())`| ✅ 支持  | 等同于 `check()`     |

::: tip 推荐
验证类请使用**方法形式**（`regex()`, `min()`, `max()` 等）。方法形式全部支持。
:::

---

## 不支持

| Schema                    | 原因                               | 替代方案                        |
| --------------------------- | ---------------------------------- | ----------------------------- |
| `custom()` / `instanceof()` | 无法解析自定义验证     | 通过 `override` 提供值         |
| `function()`                | 函数的 Mock 生成较为复杂             | 通过 `override` 提供 Mock 函数 |
| `nativeEnum()`              | 在 Zod v4 中已弃用                    | 使用 `enum()`               |
| `catchall()`                | 会被忽略（对 Mock 生成无影响） | -                             |

### 不支持 Schema 的替代示例

```ts
// z.custom() 的替代方案
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
// z.function() 的替代方案
const fnSchema = z.function().args(z.string()).returns(z.boolean());

const mock = initGenerator()
  .override((schema) => {
    if (schema instanceof z.ZodFunction) {
      return (str: string) => str.length > 0;
    }
  })
  .generate(fnSchema);
```
