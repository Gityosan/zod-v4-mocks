# API 参考

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

## MockGenerator

`initGenerator()` 返回的类实例。用于 Mock 数据的生成、自定义和输出。除 `generate` / `multiGenerate` 外，所有方法都支持方法链式调用。

### generate

```ts
generate<T extends z.ZodType>(schema: T): z.infer<T>
```

从 Schema 生成一个 Mock 数据。返回值的类型基于 Schema 的 `z.infer<T>` 进行推断。

```ts
const schema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
})

const mock = generator.generate(schema)
// 类型: { id: string; name: string; email: string }
```

::: info Branded 类型
`z.string().brand<'UserId'>()` 这样的 Branded 类型也能正确推断。生成的值遵循内部 Schema（此处为 `string`），但 TypeScript 的类型会包含 brand。

```ts
const BrandedUserId = z.string().brand<'UserId'>()
const val = generator.generate(BrandedUserId)
// val 的类型为 string & { __brand: 'UserId' }
```
:::

### multiGenerate

```ts
multiGenerate<T extends Record<string, z.ZodType>>(
  schemas: T
): { [K in keyof T]: z.infer<T[K]> }
```

从多个 Schema 一次性生成 Mock 数据。键名直接成为结果的键。

```ts
const mocks = generator.multiGenerate({
  user: z.object({ id: z.uuid(), name: z.string() }),
  post: z.object({ id: z.number().int(), title: z.string() }),
})

console.log(mocks.user) // { id: "...", name: "..." }
console.log(mocks.post) // { id: 123, title: "..." }
```

### supply

```ts
supply(constructor: z.core.$constructor<any>, value: any): MockGenerator
```

为特定的 Zod 类型设置固定值。对同一类型多次设置时，最先设置的值优先。

```ts
generator
  .supply(z.ZodString, 'テスト文字列')
  .supply(z.ZodEmail, 'test@example.com')
  .generate(schema)
```

### override

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

### register

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

### updateConfig

```ts
updateConfig(newConfig?: Partial<MockConfig>): MockGenerator
```

更新配置。现有的 `supply` / `override` 设置会被保留。

```ts
generator.updateConfig({ seed: 42, array: { min: 5, max: 10 } })
```

### serialize

```ts
serialize(data: unknown, options?: OutputOptions): string
```

将 Mock 数据序列化为字符串，而不写入文件。返回与 `output` 写入的相同内容。在需要进一步自定义输出后自行写入文件时很有用。

```ts
const data = generator.generate(schema)

// 获取序列化字符串（默认: TypeScript 格式）
const content = generator.serialize(data)
// => "export const mockData = {\n  \"id\": \"...\",\n  ...\n};\n"

// 自定义导出名称和头部/尾部
const content = generator.serialize(data, {
  exportName: 'generatedMockData',
  header: "import type { User } from './types';",
  footer: 'export type MockData = typeof generatedMockData;',
})
```

### output

```ts
output(data: unknown, options?: OutputOptions): string
```

将 Mock 数据输出到文件。仅在 Node.js 环境中可用。返回输出路径的字符串。

```ts
const data = generator.generate(schema)

// 作为 TypeScript 文件输出（默认）
generator.output(data)
// => "./__generated__/generated-mock-data.ts"

// 指定路径和扩展名
generator.output(data, { path: './mocks/user.json' })
generator.output(data, { path: './mocks/user.ts' })
generator.output(data, { path: './mocks/user.js' })

// 自定义导出名称和头部/尾部
generator.output(data, {
  path: './mocks/user.ts',
  exportName: 'generatedMockData',
  header: "import type { User } from './types';",
  footer: 'export type MockData = typeof generatedMockData;',
})
```

#### OutputOptions

```ts
type OutputOptions = {
  path?: string                // 输出路径（默认: ./__generated__/generated-mock-data.ts）
  ext?: 'json' | 'js' | 'ts'  // 扩展名（从 path 推断，未指定时为 'ts'）
  exportName?: string          // 自定义导出变量名（默认: 'mockData'，仅 ts/js）
  header?: string              // 添加到输出内容头部的字符串（JSON 格式时忽略）
  footer?: string              // 添加到输出内容尾部的字符串（JSON 格式时忽略）
}
```

#### 输出格式

| 扩展名 | 格式 | 特殊类型处理 |
|--------|------|-------------|
| `.ts` / `.js` | `export const <exportName> = ...` | 准确序列化 Date, BigInt, Map, Set, Symbol, File, Blob |
| `.json` | JSON | Date 转为 ISO 字符串，BigInt 转为字符串，Map/Set/Symbol 会丢失信息（有警告） |

::: warning JSON 输出时的数据丢失
如果将包含 JSON 无法表示的类型（BigInt, Symbol, Map, Set, File, Blob）的数据以 `.json` 格式输出，数据的准确性将会丢失。系统会输出警告信息，请考虑使用 `.ts` 或 `.js` 格式。
:::

## 类型定义

### MockConfig

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
  /** @default 5 */
  recursiveDepthLimit?: number
  /** 元数据的键名（与 register 配合使用） */
  consistentKey?: string
}
```

各设置的详情请参阅[配置指南](/zh/guide/configuration)。

### CustomGeneratorType

```ts
type CustomGeneratorType = (
  schema: z.core.$ZodType,
  options: GeneraterOptions,
) => unknown | undefined
```

返回 `undefined` 时，将使用默认生成逻辑。

### GeneraterOptions

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
}
```

在 `override` 的自定义生成器中主要使用 `faker` 和 `config`。

### OutputOptions

```ts
type OutputOptions = {
  path?: string
  ext?: 'json' | 'js' | 'ts'
  exportName?: string
  header?: string
  footer?: string
}
```

## 导出一览

```ts
import {
  initGenerator,        // 工厂函数
  type MockGenerator,   // 生成器类的类型
  type MockConfig,      // 配置的类型
  type CustomGeneratorType,  // 自定义生成器的类型
  type GeneraterOptions,     // 生成选项的类型
  type OutputOptions,        // 输出选项的类型
  type LocaleType,           // 语言环境类型
  type Faker,                // faker.js 的 Faker 类型（re-export）
  type Randomizer,           // faker.js 的 Randomizer 类型（re-export）
} from 'zod-v4-mocks'
```
