# 自定义生成器

可以为特定 Schema 设置自定义值或生成器函数。提供了 `supply` / `supplyRef` / `supplyPath` / `override` / `register` 五种方式，分别对应不同粒度的控制：

| 方法 | 目标 | 使用场景 |
|---|---|---|
| `supply` | Zod *构造器*（`z.ZodString` 等） | "所有 string 都用 X" |
| `supplyRef` | 特定的 *Schema 引用* | "只有这个子 Schema 用 X" |
| `supplyPath` | 生成树内的 *路径* | "`user.email` 这个位置用 X" |
| `override` | 任意 *函数*（schema + context） | "凡是能用代码表达的逻辑" |
| `register` | 用于一致性的相关 Schema | "`User.id` 和 `Comment.userId` 使用相同 UUID" |

## supply - 设置固定值

为特定的 Zod 类型类分配**固定值**。适用于"对于该 Schema 类型始终使用该值"的简单场景。

```ts
import { z } from 'zod'
import { initGenerator } from 'zod-v4-mocks'

const schema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
})

const mock = initGenerator()
  .supply(z.ZodString, 'テストユーザー')
  .supply(z.ZodEmail, 'test@example.com')
  .generate(schema)

// => { id: "08e93b6a-...", name: "テストユーザー", email: "test@example.com" }
```

### supply 的特点

- 指定 Zod 类型的构造函数，为该类型的所有实例设置相同的值
- 支持方法链式调用来连接多个 `supply`
- 对同一类型设置多个值时，**最先设置的值优先**

```ts
const mock = initGenerator()
  .supply(z.ZodEmail, 'first@example.com')   // 此值优先
  .supply(z.ZodEmail, 'second@example.com')  // 被忽略
  .generate(schema)
// email 为 'first@example.com'
```

### 支持的类型构造函数示例

| 构造函数 | 对应类型 |
|--------------|------|
| `z.ZodString` | `z.string()` |
| `z.ZodNumber` | `z.number()` |
| `z.ZodBoolean` | `z.boolean()` |
| `z.ZodEmail` | `z.email()` |
| `z.ZodUUID` | `z.uuid()` |
| `z.ZodURL` | `z.url()` |
| `z.ZodDate` | `z.date()` |

## supplyRef - 按 Schema 引用匹配

[▶ 在 Playground 中试用](/zh/playground/?example=supply)

`supply` 会匹配同一 Zod 类的所有 Schema。如果只想固定**某一个具体的位置**，使用 `supplyRef` 按引用相等（`===`）匹配。

```ts
const Name = z.string()

const Schema = z.object({
  user: z.object({ name: Name }),  // <- 这个 Name 节点
  bio: z.string(),                  // <- 另一个 z.string()
})

const mock = initGenerator()
  .supplyRef(Name, 'Alice')
  .generate(Schema)
// mock.user.name === 'Alice'
// mock.bio 正常生成（引用不同，互不影响）
```

- 匹配基于**实例标识**。两次调用 `z.string()` 会产生两个不同的引用，互相不匹配。
- 同一引用被 supply 多次时，与 `supply` 一样**先注册者优先**。

## supplyPath - 按结构路径匹配

`supplyPath` 在生成树的**指定路径**上固定值，与该位置的 Zod 类型无关。路径段是 `string | number | symbol`，外加两个标记：

- `'$item'` — 数组 / 元组 / Set 的所有元素
- `'$value'` — Record / Map 的所有值

```ts
const Schema = z.object({
  user: z.object({ name: z.string(), createdAt: z.date() }),
  scores: z.record(z.string(), z.number()),
  pair: z.tuple([z.string(), z.string()]),
})

const mock = initGenerator()
  .supplyPath(['user', 'name'], 'Alice')              // 对象键
  .supplyPath(['user', 'createdAt'], new Date(0))     // 叶子的强类型值
  .supplyPath(['scores', 'alice'], 100)               // 注入 record 的特定键
  .supplyPath(['scores', '$value'], 0)                // 其他值的默认
  .supplyPath(['pair', 0], 'first')                   // tuple 索引
  .generate(Schema)
```

### 不同容器的规则

| 容器 | `string` 段 | `number` 段 | `$item` | `$value` |
|---|---|---|---|---|
| `object` | 属性名 | — | — | — |
| `array` | — | 索引（必要时扩展长度） | 全部元素 | — |
| `tuple` | — | 固定索引 | 全部元素 | — |
| `record` | 注入该键 | 注入数值键 | — | 全部值 |
| `map` | 注入该键 | 注入数值键 | — | 全部值 |
| `set` | — | — | 全部成员 | — |

对于 record / map，指定具体键时会**注入**该条目 —— 即使本来不会随机生成该键，输出中也保证存在。其余条目仍然随机生成。

### 具体路径胜过标记路径

当两者都能匹配时，字面量路径优先于 `$item` / `$value`。同一 specificity 内则先注册者优先。

```ts
const mock = initGenerator({ array: { min: 3, max: 3 } })
  .supplyPath(['$item'], 'default')
  .supplyPath([1], 'middle')
  .generate(z.array(z.string()))
// => ['default', 'middle', 'default']
```

### 为什么没有 `$key`

"将所有键替换为同一个值"的 `$key` 是有意不支持的：record / map 的键必须唯一，所以"全部键 = X"会把集合塌缩成一个条目。通过字面量段指定具体键已经覆盖了常用场景。

### Symbol 段

Symbol 引用是 `z.record(z.symbol(), ...)` 和 `z.map(z.symbol(), ...)` 的有效路径段。

```ts
const KEY = Symbol('user')
const Schema = z.map(z.symbol(), z.number())
const mock = initGenerator().supplyPath([KEY], 7).generate(Schema)
// mock.get(KEY) === 7
```

`Set` 不支持按成员指定（其成员没有稳定的标识）。

::: info supplyPath 会穿透包装器
路径匹配与该位置外层的包装器 Schema 无关。
即使 `name` 是 `z.string().optional()` / `.nullable()` / `.default()` /
`z.lazy(...)`，`supplyPath(['name'], 'X')` 仍然生效 —— 提供的值替换该槽位，
包装器的概率逻辑被绕过。若要刻意产生 `undefined`/`null`，请显式提供该值：
`supplyPath(['name'], undefined)`。
:::

## override - 自定义生成器函数

[▶ 在 Playground 中试用](/zh/playground/?example=override)

当需要比 `supply` 更灵活的自定义时，使用 `override`。可以定义一个接收 Schema 和选项作为参数并返回自定义值的函数。

```ts
import { type CustomGeneratorType, initGenerator } from 'zod-v4-mocks'
import { z } from 'zod'

const schema = z.object({
  name: z.string(),
  email: z.email(),
})

const customGenerator: CustomGeneratorType = (schema, options) => {
  const { faker } = options
  if (schema instanceof z.ZodString) {
    return 'custom: ' + faker.person.fullName()
  }
  // 返回 undefined 时将使用默认生成逻辑
}

const mock = initGenerator()
  .override(customGenerator)
  .generate(schema)
```

### CustomGeneratorType 的类型定义

```ts
type CustomGeneratorType = (
  schema: z.core.$ZodType,
  options: GeneraterOptions,
) => unknown | undefined
```

- **`schema`**: 当前正在处理的 Zod Schema 实例
- **`options`**: 生成选项（包含 `faker` 实例）
- **返回值**: 要生成的值。返回 `undefined` 时将回退到默认生成逻辑

### Schema 实例比较

除了 `instanceof` 外，还可以通过直接比较 **Schema 的引用**来实现更精细的控制。

```ts
const basicSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
})

const customGenerator: CustomGeneratorType = (schema, options) => {
  const { faker } = options
  // 仅自定义 name 字段（其他 z.string() 不受影响）
  if (schema instanceof z.ZodString && schema === basicSchema.shape.name) {
    return 'custom name: ' + faker.person.fullName()
  }
}
```

### 处理 `z.custom()` 和 `z.instanceof()`

`z.custom()` 在运行时没有"应该生成什么"的提示，因此本库从 Schema 的 `meta` 读取生成器。meta 键名通过 [`customMockKey`](/zh/guide/configuration#custommockkey) 配置，默认为 `'mock'`。

```ts
const FileSchema = z.custom<File>((v) => v instanceof File).meta({
  mock: (faker) => new File(['x'], faker.system.fileName()),
})

const BigDec = z.instanceof(BigDecimal).meta({
  mock: () => new BigDecimal('1.5'),
})

const mock = initGenerator().generate(z.object({ file: FileSchema, n: BigDec }))
```

meta 值可以是函数 `(faker, options) => unknown`，也可以是普通值。

当 `z.custom` 的某个位置既没有 meta `mock` 也没有 `supplyRef` 时，该值被视为**省略** —— 会被静默地从数组 / 对象 / record / map / set 中丢弃；tuple（长度固定无法收缩）则会发出警告。

如果想在测试中一次性固定某个值，可以使用 `supplyRef`，其优先级高于 meta：

```ts
const mock = initGenerator()
  .supplyRef(FileSchema, new File(['fixed'], 'fixed.txt'))
  .generate(FileSchema)
```

## supply 与 override 的优先级

当对同一类型同时设置了 `supply` 和 `override` 时，**先设置的优先**。按 `supply` -> `override` 的顺序设置时，`supply` 优先。

```ts
const customGenerator: CustomGeneratorType = (schema) => {
  if (schema instanceof z.ZodEmail) {
    return 'override@example.com'
  }
}

const mock = initGenerator()
  .supply(z.ZodEmail, 'supply@example.com')  // 先设置 → 优先
  .override(customGenerator)                  // 后设置
  .generate(schema)
// email 为 'supply@example.com'
```

内部实现上，`supply` 和 `override` 都会被添加到同一个自定义生成器链中。先添加的先被评估，当返回非 `undefined` 值时即确定结果。

### 完整的优先级顺序

所有自定义方式的整体优先级：

1. **`supplyPath`** —— 匹配的路径优先于其他一切（最具体的位置指定）
2. **`consistentKey` 注册表** —— Schema 已注册为一致性值时
3. **`supply` / `supplyRef` / `override`** —— 统一的自定义生成器链（先注册者优先）
4. **`keyMapping`** —— 属性名 → faker 的可选映射（仅对原始叶子 Schema 生效）
5. **`z.custom().meta(...)`** —— `z.custom` / `z.instanceof` 的 meta 驱动生成器
6. **默认生成** —— 库的内置规则

## 可复现的自定义生成器

要在自定义生成器中生成可复现的值，请使用 `options.faker` 而不是 `Math.random()`。`faker` 实例内置了基于 seed 的随机数生成器（RNG）。

```ts
const deterministicOverride: CustomGeneratorType = (schema, options) => {
  const { faker } = options // seeded RNG
  if (schema instanceof z.ZodEmail) {
    const user = faker.internet.userName()
    const host = faker.internet.domainName()
    return `${user}@${host}`
  }
}

const gen = initGenerator({ seed: 12345 })
  .override(deterministicOverride)

const a = gen.generate(z.email()) // 相同 seed 每次都生成相同的值
```

::: warning 避免破坏可复现性的函数
以下函数会忽略种子值，导致测试的可复现性丢失：
- `Math.random()`
- `Date.now()`
- `crypto.randomUUID()`

请改用 `options.faker.number.int()`, `options.faker.date.recent()` 等。
:::

## register - 一致的数据生成

要在关联字段之间共享相同的值，请使用 `register`。详情请参阅[配置 - consistentKey 与 register](/zh/guide/configuration#consistentkey-与-register)。

```ts
const consistentKey = 'name'
const UserId = z.uuid().meta({ [consistentKey]: 'UserId' })

const userSchema = z.object({
  id: UserId,
  name: z.string(),
})

const commentSchema = z.object({
  userId: UserId, // 会生成与 userSchema.id 相同的值
  value: z.string(),
})

const mock = initGenerator({ consistentKey })
  .register([UserId])
  .generate(commentSchema)
```

## 实用模式

### 测试用工厂函数

```ts
function createMockUser(overrides?: Partial<z.infer<typeof userSchema>>) {
  const generator = initGenerator({ seed: 1 })
  const base = generator.generate(userSchema)
  return { ...base, ...overrides }
}

// 使用示例
const user = createMockUser({ name: 'テストユーザー' })
```

### 组合多个 override

```ts
const emailOverride: CustomGeneratorType = (schema, options) => {
  if (schema instanceof z.ZodEmail) {
    return `user${options.faker.number.int({ max: 999 })}@test.com`
  }
}

const dateOverride: CustomGeneratorType = (schema, options) => {
  if (schema instanceof z.ZodDate) {
    return options.faker.date.recent({ days: 30 })
  }
}

const mock = initGenerator({ seed: 42 })
  .override(emailOverride)
  .override(dateOverride)
  .generate(schema)
```

## 下一步

- [配置](/zh/guide/configuration) - MockConfig 的所有选项
- [Schema 支持情况](/zh/guide/schema-support) - 支持 Schema 的详细信息
- [API 参考](/zh/api/) - 所有方法的详细说明
