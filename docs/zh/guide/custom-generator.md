# 自定义生成器

可以为特定 Schema 设置自定义值或生成器函数。提供了 `supply`、`override`、`register` 三种方式，分别适用于不同的使用场景。

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

## override - 自定义生成器函数

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

### 处理不支持的 Schema

对于 `z.custom()` 或 `z.instanceof()` 等库不支持的 Schema，可以通过 `override` 提供值。

```ts
const myCustomSchema = z.custom<MyClass>((val) => val instanceof MyClass)

const customGenerator: CustomGeneratorType = (schema) => {
  if (schema === myCustomSchema) {
    return new MyClass()
  }
}

const mock = initGenerator()
  .override(customGenerator)
  .generate(myCustomSchema)
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
