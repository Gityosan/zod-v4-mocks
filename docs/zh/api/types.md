# 类型

导出的类型定义。大多数通过 `import type { … } from 'zod-v4-mocks'` 导入。

## MockConfig

```ts
interface MockConfig {
  /** @default [en, base] */
  locale?: LocaleType | LocaleType[]
  /** @default generateMersenne53Randomizer() from faker.js */
  randomizer?: Randomizer
  /** @default 1 */
  seed: number
  /** @default { min: 1, max: 3 } */
  array: { min: number; max: number }
  /** @default { min: 1, max: 3 } */
  map: { min: number; max: number }
  /** @default { min: 1, max: 3 } */
  set: { min: number; max: number }
  /** @default { min: 1, max: 3 } */
  record: { min: number; max: number }
  /** @default 0.5 */
  optionalProbability: number
  /** @default 0.5 */
  nullableProbability: number
  /** @default 0.5 */
  defaultProbability: number
  /** @default 5 @deprecated 请使用 recursiveDepthLimit */
  lazyDepthLimit: number
  /** @default 5 —— 递归 Schema（z.lazy / 循环 getter）的最大深度 */
  recursiveDepthLimit?: number
  /** 元数据的键名（与 register 配合使用） */
  consistentKey?: string
  /** @default 'mock' —— z.custom()/z.instanceof() 上自定义 mock 生成器的 meta 键 */
  customMockKey?: string
  /** @default 'off' —— 将属性键映射到 faker 函数：'off' | 'auto' | KeyMapper */
  keyMapping?: 'off' | 'auto' | KeyMapper
  /** @default true —— 运行预检 Schema 遍历，拒绝无法 Mock 的 Schema */
  preflightCheck?: boolean
}
```

各设置的详情请参阅 [配置指南](/zh/guide/configuration)。

::: info preflightCheck
启用 `preflightCheck`（默认）时，`generate` 会在生成前先遍历一次 Schema，并对无法安全 Mock 的 Schema 抛出错误——例如在定长元组位置上的未 Mock 的
`z.custom()`。警告级别的问题会被记录并自动修复。可通过 `initGenerator({ preflightCheck: false })` 将其禁用。
:::

## CustomGeneratorType

```ts
type CustomGeneratorType = (
  schema: z.core.$ZodType,
  options: GeneraterOptions,
) => unknown | undefined
```

返回 `undefined` 时，将使用默认生成逻辑。传递给 [`override`](/zh/api/customization#override)。

## GeneraterOptions

```ts
type GeneraterOptions = {
  faker: Faker                          // 带 seed 的 faker 实例
  config: MockConfig                    // 当前配置
  customGenerator?: CustomGeneratorType // 自定义生成器
  registry: z.core.$ZodRegistry | null  // Schema 注册表
  valueStore?: Map<string, unknown[]>   // register 预生成的值
  arrayIndexes: number[]                // 数组的当前索引
  pinnedHierarchy: Map<string, number>  // 一致性生成的层级
  circularRefs: Map<z.core.$ZodType, number> // 循环引用的深度追踪
  pathSupplies: PathSupply[]            // 此处作用域内的 supplyPath 条目
  keyMappingKey?: string                // 此处符合 keyMapping 条件的属性名
  supplyRefTargets: Set<z.core.$ZodType> // 通过 supplyRef 注册的 Schema 引用
  hasOpaqueCustomizer: boolean          // 一旦注册了 supply/override 即为 true
  preflightFixes: Map<z.core.$ZodType, z.core.$ZodType> // 来自预检的自动修复
}
```

在 `override` 的自定义生成器中，主要使用 `faker` 和 `config`；其余为内部生成状态。

## OutputOptions

```ts
type OutputOptions = {
  path?: string
  ext?: 'json' | 'js' | 'ts'
  exportName?: string
  header?: string
  footer?: string
  binary?: boolean
}
```

由 [`serialize`](/zh/api/serialization#serialize) 和 [`output`](/zh/api/serialization#output) 使用。逐字段的说明在 [序列化与输出](/zh/api/serialization#outputoptions) 页面。

## PortableOptions

```ts
type PortableOptions = {
  base64?: boolean // 将字符串进行 base64 编码（文本安全）
}
```

由 [`serializePortable`](/zh/api/serialization#serializeportable-serializeportableasync) 和 [`deserializePortable`](/zh/api/serialization#deserializeportable) 使用。两端需传入相同的标志。

## PathSegment

```ts
type PathSegment = string | number | symbol
```

[`supplyPath`](/zh/api/customization#supplypath) 路径中的单个步骤。对象键为字符串，数组/元组位置为数字，两个标记常量可定位某个位置上的所有元素：

```ts
import { ITEM_MARKER, VALUE_MARKER } from 'zod-v4-mocks'

ITEM_MARKER  // '$item'  —— 数组 / 集合 / 元组的每一个元素
VALUE_MARKER // '$value' —— 记录 / 映射的每一个值
```

## Re-exports

```ts
type LocaleType   // keyof typeof allLocales —— 有效的 faker 语言环境键
type Faker        // faker.js 的 Faker 类型（re-export）
type Randomizer   // faker.js 的 Randomizer 类型（re-export）
```
