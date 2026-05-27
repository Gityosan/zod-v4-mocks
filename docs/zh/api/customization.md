# 自定义

在调用 [生成](/zh/api/generation) 方法之前，用于塑造*生成内容*的方法。这些方法全部可链式调用——它们返回同一个
`MockGenerator` 实例。

三个 `supply*` 方法以递增的精度级别固定值：按
**类型**（`supply`）、按 **Schema 引用**（`supplyRef`），以及按 **路径**
（`supplyPath`）。

## supply

```ts
supply(constructor: z.core.$constructor<any>, value: any): MockGenerator
```

为特定的 Zod 类型设置固定值。对同一类型多次设置时，最先设置的值优先。

```ts
generator
  .supply(z.ZodString, 'test string')
  .supply(z.ZodEmail, 'test@example.com')
  .generate(schema)
```

## supplyRef

```ts
supplyRef(subSchema: z.core.$ZodType, value: unknown): MockGenerator
```

为某个**特定的 Schema 实例**（按引用）固定一个值，而不是为该类型的每一个 Schema 固定值。当两个字段共享相同的 Zod 类型但只想固定其中之一时，或者要为某个原本无法 Mock 的 Schema（例如裸的 `z.custom()`）赋值时，请使用它。冲突时最先注册者优先。

```ts
const SpecialId = z.string()

const schema = z.object({
  id: z.string(),        // 保持随机
  specialId: SpecialId,  // 始终为 'FIXED'
})

generator
  .supplyRef(SpecialId, 'FIXED')
  .generate(schema)
```

## supplyPath

```ts
supplyPath(path: PathSegment[], value: unknown): MockGenerator
```

在生成结构内部的**特定位置**固定一个值，该位置由一系列段组成的路径来定位
（[`PathSegment`](/zh/api/types#pathsegment) 为
`string | number | symbol`）：

- **对象** → 字符串键
- **数组 / 元组** → 数字索引
- **记录 / 映射** → 字面量键（即使未被随机生成，也会被注入）

两个标记常量可定位某个位置上的*所有*元素，而非仅一个：

| 标记 | 值 | 匹配 |
|--------|-------|---------|
| `ITEM_MARKER` | `'$item'` | 数组 / 集合 / 元组的每一个元素 |
| `VALUE_MARKER` | `'$value'` | 记录 / 映射的每一个值 |

冲突时字面量段总是胜过标记（特异性更高者优先）。定位 `'$key'` 是有意不予支持的。

```ts
import { initGenerator, ITEM_MARKER, VALUE_MARKER } from 'zod-v4-mocks'

const schema = z.object({
  user: z.object({ name: z.string() }),
  tags: z.array(z.string()),
  scores: z.record(z.string(), z.number()),
})

generator
  .supplyPath(['user', 'name'], 'Alice')   // 精确字段
  .supplyPath(['tags', 0], 'first')         // 数组第一个元素
  .supplyPath(['tags', ITEM_MARKER], 'x')   // 数组的每一个元素
  .supplyPath(['scores', VALUE_MARKER], 0)  // 记录的每一个值
  .generate(schema)
```

::: tip 数组长度
字面量数字索引会扩展生成的数组，以使被定位的索引存在（受内部硬上限限制，以防范诸如
`supplyPath(['x', 1e8], …)` 之类的笔误）。
:::

## override

```ts
override(customGenerator: CustomGeneratorType): MockGenerator
```

注册自定义生成器函数。当函数返回 `undefined` 时，将回退到默认生成逻辑。

```ts
const customGen: CustomGeneratorType = (schema, options) => {
  if (schema instanceof z.ZodString) {
    return options.faker.person.fullName()
  }
}

generator.override(customGen).generate(schema)
```

函数签名请参阅 [`CustomGeneratorType`](/zh/api/types#customgeneratortype) 和
[`GeneraterOptions`](/zh/api/types#generateroptions)，相关模式请参阅
[自定义生成器指南](/zh/guide/custom-generator)。

## register

```ts
register(schemas: z.ZodType[]): MockGenerator
```

为一致性数据生成注册 Schema。与 `consistentKey` 配合使用，为具有相同元数据键的字段分配相同的值。

```ts
const UserId = z.uuid().meta({ name: 'UserId' })

generator
  .register([UserId])
  .generate(z.object({ userId: UserId }))
```

`register` 在内部为每个 Schema 预生成 `config.array.max` 个值并保存到 valueStore 中。生成时如果找到具有相同元数据键的 Schema，会根据数组索引从保存的值中取出。

## updateConfig

```ts
updateConfig(newConfig?: Partial<MockConfig>): MockGenerator
```

更新配置。现有的 `supply` / `override` 设置会被保留。

```ts
generator.updateConfig({ seed: 42, array: { min: 5, max: 10 } })
```
