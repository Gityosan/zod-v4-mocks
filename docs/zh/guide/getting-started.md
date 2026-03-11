# 快速开始

## 什么是 zod-v4-mocks

这是一个从 Zod v4 Schema 自动生成 Mock 数据的库。在测试、开发和原型设计中，可以从 Schema 定义即时生成逼真的虚拟数据。

内部使用了 [@faker-js/faker](https://fakerjs.dev/)，能够生成符合电子邮件、URL、UUID 等格式的数据。

::: tip 如果您使用的是 Zod v3 (v4 preview)
如果您在 `zod@3.25.76` 中使用 `import from 'zod/v4'`，请使用 [zod-v4-preview-mocks](https://www.npmjs.com/package/zod-v4-preview-mocks)。
:::

## 安装

::: code-group
```bash [npm]
npm install zod-v4-mocks
```
```bash [pnpm]
pnpm add zod-v4-mocks
```
```bash [yarn]
yarn add zod-v4-mocks
```
:::

**前置要求**: Zod v4.0.0 及以上、Node.js 18 及以上

## 基本用法

```ts
import { z } from 'zod'
import { initGenerator } from 'zod-v4-mocks'

const schema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
  age: z.number().min(18).max(120).optional(),
  isActive: z.boolean(),
  tags: z.array(z.string()),
  createdAt: z.date(),
})

const generator = initGenerator({ seed: 1 })
const mockUser = generator.generate(schema)
console.log(mockUser)
// => { id: "08e93b6a-...", name: "subito", email: "Dion59@gmail.com", ... }
```

生成的值基本上能够通过 Schema 的验证：

```ts
schema.parse(mockUser) // OK - 验证通过
```

## 批量生成多个 Mock 数据

使用 `multiGenerate` 可以从多个 Schema 一次性生成 Mock 数据。

```ts
const userSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
})

const postSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  body: z.string(),
  published: z.boolean(),
})

const generator = initGenerator({ seed: 1 })
const mocks = generator.multiGenerate({
  user: userSchema,
  post: postSchema,
})

console.log(mocks.user) // { id: "...", name: "...", email: "..." }
console.log(mocks.post) // { id: 123, title: "...", body: "...", published: true }
```

## 可复现的生成

指定相同的 `seed` 值，每次都会生成相同的 Mock 数据。这对于测试的稳定性非常有用。

```ts
const gen1 = initGenerator({ seed: 42 })
const gen2 = initGenerator({ seed: 42 })

const schema = z.string()
gen1.generate(schema) === gen2.generate(schema) // true
```

::: tip 保持可复现性的提示
使用 `override` 定义自定义生成器时，请使用参数中传入的 `options.faker`，而不是 `Math.random()` 或 `Date.now()`。`faker` 实例使用基于 seed 的随机数生成器（RNG）。
:::

## 复杂 Schema

支持嵌套对象、数组、Record、Union 等复杂 Schema。

```ts
const complexSchema = z.object({
  user: z.object({
    profile: z.object({
      name: z.string(),
      bio: z.string().optional(),
    }),
    preferences: z.object({
      theme: z.enum(['light', 'dark', 'auto']),
      notifications: z.boolean().default(true),
    }),
  }),
  posts: z.array(
    z.object({
      title: z.string(),
      content: z.string(),
      publishedAt: z.date().nullable(),
      tags: z.array(z.string()),
    }),
  ),
  metadata: z.record(
    z.string(),
    z.union([z.string(), z.number(), z.boolean()]),
  ),
})

const mock = initGenerator().generate(complexSchema)
```

## 支持的 Schema

### 完全支持

| 类别 | Schema |
|---------|---------|
| **基本类型** | string, number, boolean, bigint, date, null, undefined, void, any, unknown, NaN, symbol |
| **字符串格式** | email, URL, UUID (v1~v8), GUID, NanoID, ULID, CUID, CUID2, XID, KSUID, JWT, emoji, IPv4, IPv6, CIDRv4, CIDRv6, Base64, Base64URL, E164, hostname, datetime, isodate, isotime, isoduration |
| **集合** | object, array, tuple, record, map, set |
| **复合类型** | union, discriminatedUnion, intersection (同类型), xor |
| **修饰符** | optional, exactOptional, nullable, nonoptional, readonly, default, prefault |
| **其他** | enum, literal, templateLiteral, lazy, pipe, codec, catch, success, file |

### 部分支持

| Schema | 注意事项 |
|---------|--------|
| `z.lazy()` | 有深度限制（默认 5 层）。顶层 `union` 可能会报错 |
| `z.intersection()` | 同类型之间支持。不同类型之间原则上不支持（object+record、array+tuple 为例外） |
| `.refine()` | 验证条件会被忽略 |
| `.check()` | 仅支持 `z.overwrite()` / `z.trim()`。不支持 `z.regex()` / `z.minLength()` 等（方法形式 `.regex()` 已支持） |

### 不支持

| Schema | 原因 |
|---------|------|
| `z.custom()` / `z.instanceof()` | 无法解析自定义验证。可通过 `override` 回避 |
| `z.function()` | 函数的 Mock 生成较为复杂 |
| `.catchall()` | 会被忽略（对 Mock 生成无影响） |
| `z.nativeEnum()` | 在 Zod v4 中已弃用。请使用 `z.enum()` |

## 下一步

- [配置](/zh/guide/configuration) - MockConfig 的所有选项
- [自定义生成器](/zh/guide/custom-generator) - supply / override / register 的用法
- [API 参考](/zh/api/) - 所有方法的详细说明
- [Playground](/zh/playground/) - 在浏览器中试用
