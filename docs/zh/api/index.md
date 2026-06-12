# API 参考

`zod-v4-mocks` 暴露了单一的工厂函数 `initGenerator`，它返回一个
`MockGenerator`。其余的所有能力——生成、自定义、序列化和文件输出——都是该实例上的方法。

本参考文档拆分为多个聚焦的页面：

- **[生成](/zh/api/generation)** — `generate`、`multiGenerate`、`generateMany`、`factory`
- **[自定义](/zh/api/customization)** — `supply`、`supplyRef`、`supplyPath`、`override`、`register`、`updateConfig`
- **[序列化与输出](/zh/api/serialization)** — `serialize`、`serializeBinary`、`deserialize`、`serializePortable`、`deserializePortable`、`output`
- **[类型](/zh/api/types)** — `MockConfig`、`CustomGeneratorType`、`GeneraterOptions`、`OutputOptions`、`PortableOptions`、`PathSegment` 及 re-export

## initGenerator

```ts
function initGenerator(config?: Partial<MockConfig>): MockGenerator
```

创建 `MockGenerator` 实例。省略 `config` 时使用默认设置。

```ts
import { initGenerator } from 'zod-v4-mocks'

// 默认设置
const generator = initGenerator()

// 自定义设置
const generator = initGenerator({
  seed: 42,
  array: { min: 2, max: 5 },
  locale: 'ja',
})
```

所有选项请参阅 [`MockConfig`](/zh/api/types#mockconfig)，或参阅
[配置指南](/zh/guide/configuration) 获取说明。

## MockGenerator

`initGenerator()` 返回的类实例。用于 Mock 数据的生成、自定义和输出。

### 方法链式调用

自定义和配置方法会返回同一个实例，因此可以链式调用。终结方法——即生成数据或字符串的那些方法——则不可链式调用。

| 方法 | 返回值 | 可链式 |
|--------|---------|-----------|
| `supply` / `supplyRef` / `supplyPath` | `MockGenerator` | ✅ |
| `override` | `MockGenerator` | ✅ |
| `register` | `MockGenerator` | ✅ |
| `updateConfig` | `MockGenerator` | ✅ |
| `generate` / `multiGenerate` / `generateMany` | 数据 | ❌ |
| `factory` | `{ next, take }` | ❌ |
| `serialize` / `serializeBinary` / `serializePortable*` | `string` / `Uint8Array` | ❌ |
| `deserialize` / `deserializePortable` | 数据 | ❌ |
| `output` | 输出路径 `string` | ❌ |

```ts
const data = initGenerator({ seed: 42 })
  .supply(z.ZodString, 'fixed')
  .override(customGen)
  .generate(schema)
```

## 导出一览

```ts
import {
  initGenerator,             // 工厂函数
  ITEM_MARKER,               // '$item' —— 用于数组/集合/元组元素的 supplyPath 标记
  VALUE_MARKER,              // '$value' —— 用于记录/映射值的 supplyPath 标记
  type MockGenerator,        // 生成器类的类型
  type MockConfig,           // 配置的类型
  type CustomGeneratorType,  // 自定义生成器的类型
  type GeneraterOptions,     // 生成选项的类型
  type OutputOptions,        // 输出选项的类型
  type PortableOptions,      // 可移植序列化选项的类型
  type PathSegment,          // supplyPath 段的类型
  type LocaleType,           // 语言环境类型
  type Faker,                // faker.js 的 Faker 类型（re-export）
  type Randomizer,           // faker.js 的 Randomizer 类型（re-export）
} from 'zod-v4-mocks'
```
