# 配置

通过向 `initGenerator()` 传递选项对象，可以自定义 Mock 生成的行为。

## MockConfig

```ts
interface MockConfig {
  locale?: LocaleType | LocaleType[]  // default: [en, base]
  randomizer?: Randomizer             // faker.js 的随机器
  seed: number                        // default: 1
  array: { min: number; max: number } // default: { min: 1, max: 3 }
  map: { min: number; max: number }   // default: { min: 1, max: 3 }
  set: { min: number; max: number }   // default: { min: 1, max: 3 }
  record: { min: number; max: number } // default: { min: 1, max: 3 }
  optionalProbability: number          // default: 0.5
  nullableProbability: number          // default: 0.5
  defaultProbability: number           // default: 0.5
  recursiveDepthLimit?: number         // default: 5
  consistentKey?: string               // 元数据的键名
}
```

## 基本配置示例

```ts
import { z } from 'zod'
import { initGenerator } from 'zod-v4-mocks'

const generator = initGenerator({
  seed: 42,
  array: { min: 2, max: 5 },
  locale: 'ja',
})

const schema = z.object({
  name: z.string(),
  tags: z.array(z.string()),
})

const mock = generator.generate(schema)
// tags 会生成 2~5 个元素
```

## seed（种子值）

指定 `seed` 后会生成可复现的 Mock 数据。使用相同的种子值，每次都能获得相同的结果，这对于确保测试稳定性非常有用。

```ts
const gen1 = initGenerator({ seed: 42 })
const gen2 = initGenerator({ seed: 42 })

const schema = z.string()
gen1.generate(schema) === gen2.generate(schema) // true
```

可复现性在所有已支持的 Schema 中均有保证。包含 transform 和 regex 模式的 Schema 也同样适用。

```ts
const schema = z.string().transform((val) => val.toUpperCase())

const g1 = initGenerator({ seed: 444 })
const g2 = initGenerator({ seed: 444 })

const results1 = Array.from({ length: 3 }, () => g1.generate(schema))
const results2 = Array.from({ length: 3 }, () => g2.generate(schema))
// results1 和 results2 完全一致
```

::: tip 保持可复现性的提示
使用自定义生成器（`override`）时，请使用参数中传入的 `options.faker`，而不是 `Math.random()` 或 `Date.now()`。`faker` 实例使用基于 seed 的随机数生成器（RNG）。
:::

## locale（语言环境）

指定 faker.js 的语言环境。可以指定单个字符串，也可以通过数组按优先级指定多个语言环境。

```ts
// 日语语言环境
const generator = initGenerator({ locale: 'ja' })

// 多个语言环境（按优先级）
const generator = initGenerator({ locale: ['ja', 'en'] })
```

默认值为 `[en, base]`（faker.js 的默认值）。更改语言环境后，`faker.person.fullName()` 等生成的名称会变为对应语言。

## 集合大小控制

通过 `array`, `map`, `set`, `record` 的 `min`/`max`，可以分别控制各集合类型的生成元素数量。

```ts
const generator = initGenerator({
  array: { min: 2, max: 5 },   // 数组长度: 2~5
  record: { min: 1, max: 3 },  // Record 条目数: 1~3
  map: { min: 2, max: 4 },     // Map 条目数: 2~4
  set: { min: 1, max: 3 },     // Set 元素数: 1~3
})
```

::: info Schema 侧约束的优先级
当 Schema 设置了 `.min()` / `.max()` / `.nonempty()` 时，Schema 侧的约束优先。

```ts
const gen = initGenerator({ array: { min: 1, max: 2 } })
const schema = z.array(z.string()).min(5) // Schema 的 min(5) 优先
const result = gen.generate(schema)
// result.length >= 5 有保证
```
:::

## 概率控制

控制 Optional / Nullable / Default 类型生成值的概率。值的范围为 `0`（0%）到 `1`（100%）。

### optionalProbability

`optional` 类型中**值被省略（变为 `undefined`）的概率**。

```ts
// 30% 的概率变为 undefined
const gen = initGenerator({ optionalProbability: 0.3 })

// 一定会生成值（不会变为 undefined）
const gen = initGenerator({ optionalProbability: 0 })

// 一定会变为 undefined
const gen = initGenerator({ optionalProbability: 1 })
```

### nullableProbability

`nullable` 类型中**生成 `null` 的概率**。

```ts
// 30% 的概率生成 null
const gen = initGenerator({ nullableProbability: 0.3 })
```

### defaultProbability

`default` 类型中**使用默认值的概率**。

```ts
const gen = initGenerator({ defaultProbability: 0.8 })

const schema = z.boolean().default(true)
// 80% 的概率为 true（默认值），20% 的概率为随机 boolean
```

## recursiveDepthLimit

递归 Schema（`z.lazy()` 和基于 getter 的循环引用）的最大深度。默认值为 `5`。

```ts
const generator = initGenerator({ recursiveDepthLimit: 3 })
```

当达到深度上限时，将返回空对象 `{}` 作为终止符。

```ts
type Category = {
  name: string
  subcategories: Category[]
}

const categorySchema: z.ZodType<Category> = z.lazy(() =>
  z.object({
    name: z.string(),
    subcategories: z.array(categorySchema),
  }),
)

const gen = initGenerator({ recursiveDepthLimit: 2 })
const result = gen.generate(categorySchema)
// => { name: "...", subcategories: [{ name: "...", subcategories: [{}] }] }
//                                                        ↑ 达到深度限制，返回空对象
```

基于 getter 的循环引用同样适用。

```ts
const Node = z.object({
  value: z.number(),
  get next() {
    return Node.optional()
  },
})

const gen = initGenerator({ recursiveDepthLimit: 3 })
const result = gen.generate(Node) // 正常终止
```

::: info lazyDepthLimit（已弃用）
`lazyDepthLimit` 与 `recursiveDepthLimit` 功能相同。当设置了 `recursiveDepthLimit` 时，后者优先。新代码中请使用 `recursiveDepthLimit`。
:::

## consistentKey 与 register

用于在关联字段之间生成**一致的值**。例如，当您想为 `User.id` 和 `Comment.userId` 分配相同的 UUID 时非常有用。

### 工作原理

1. 通过 `.meta()` 为共享 Schema 设置元数据键
2. 在 `initGenerator` 中指定 `consistentKey`
3. 使用 `.register()` 注册 Schema
4. 注册的 Schema 在使用时会生成一致的值

### 实际示例

```ts
import { z } from 'zod'
import { initGenerator } from 'zod-v4-mocks'

// 设置元数据的键名
const consistentKey = 'name'
const UserId = z.uuid().meta({ [consistentKey]: 'UserId' })
const CommentId = z.uuid().meta({ [consistentKey]: 'CommentId' })
const PostId = z.uuid().meta({ [consistentKey]: 'PostId' })

// Schema 定义
const userSchema = z.object({
  id: UserId,       // ← 生成相同的 UserId
  name: z.string(),
})

const commentSchema = z.object({
  id: CommentId,
  postId: PostId,   // ← 生成相同的 PostId
  user: userSchema,
  userId: UserId,   // ← 与 userSchema.id 相同的值
  value: z.string(),
})

const postSchema = z.object({
  id: PostId,       // ← 与 commentSchema.postId 相同的值
  comments: z.array(commentSchema),
  value: z.string(),
})

// 通过 register 注册 Schema，通过 generate 生成
const schemas = [CommentId, UserId, PostId]
const mock = initGenerator({ consistentKey })
  .register(schemas)
  .generate(z.array(postSchema))
```

上述示例保证了以下一致性：

- 每个 Post 的 `id` 与该 Post 中 Comment 的 `postId` 一致
- 每个 User 的 `id` 与 `userId` 一致

```json
[
  {
    "id": "08e93b6a-0a0b-4718-81af-c91ba0c86c67",
    "comments": [
      {
        "id": "b438b6fa-765b-4706-8b22-88adb9b5534a",
        "postId": "08e93b6a-0a0b-4718-81af-c91ba0c86c67",
        "user": {
          "id": "c9b26358-a125-4ad8-ad65-52d58980fe34",
          "name": "acceptus"
        },
        "userId": "c9b26358-a125-4ad8-ad65-52d58980fe34",
        "value": "antepono"
      }
    ],
    "value": "ut"
  }
]
```

## updateConfig

配置也可以通过 `updateConfig()` 在之后进行更改。

```ts
const generator = initGenerator({ seed: 1 })
generator.generate(z.string()) // 使用 seed: 1 生成

generator.updateConfig({ seed: 42, array: { min: 5, max: 10 } })
generator.generate(z.string()) // 使用 seed: 42 生成
```

`updateConfig` 在保持现有 `supply` / `override` 设置的同时，仅更新 config。

## 下一步

- [自定义生成器](/zh/guide/custom-generator) - supply / override / register 的用法
- [Schema 支持情况](/zh/guide/schema-support) - 支持 Schema 的详细信息
- [API 参考](/zh/api/) - 所有方法的详细说明
