# 序列化与输出

将生成的数据转换为字符串、二进制 buffer 或文件的方法——以及与之配套的反序列化方法。这些方法都不可链式调用。

## 选择方法

| 方法 | 输出 | 运行时 | 保留 | 无损往返 |
|--------|--------|---------|-----------|---------------------|
| `serialize` | `.ts` / `.js` / `.json` 源码字符串 | 任意（仅字符串） | 在 ts/js 中保留 Date、BigInt、Map、Set、Symbol、File、Blob | ❌（源码文本，JSON 会丢失类型） |
| `serializeBinary` | `Buffer`（`v8.serialize`） | **仅限 Node** | Date、Map、Set、RegExp、BigInt、TypedArray、`undefined`、循环引用 | ✅ |
| `serializePortable` | 可移植字符串（seroval） | **任意**（Node ↔ 浏览器） | 以上所有 **+** `NaN`/`Infinity`、共享引用、`Symbol`、URL/URLSearchParams/Headers | ✅ |
| `output` | 磁盘上的文件 | **仅限 Node** | 取决于扩展名（见下文） | 配合 `binary: true` 时为 ✅ |

经验法则：人类可读的测试数据用 **`serialize`**，仅限 Node 的无损 blob 用 **`serializeBinary`**，当数据必须跨运行时（例如在 Node 中生成、在浏览器中还原）时用 **`serializePortable`**。

## serialize

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

## serializeBinary

```ts
serializeBinary(data: unknown): Buffer
```

使用 Node.js 的结构化克隆算法（`v8.serialize`）将数据序列化为二进制 `Buffer`。可无损保留 `Date`、`Map`、`Set`、`RegExp`、`BigInt`、`TypedArray`、`undefined` 以及循环引用。结果仅可在 Node.js 环境中通过 `deserialize`（或 `v8.deserialize`）读取。

```ts
const data = generator.generate(schema)
const buf = generator.serializeBinary(data) // Buffer
```

## deserialize

```ts
deserialize<T = unknown>(input: Buffer | Uint8Array | string): T
```

还原此前通过 `serializeBinary` 或 `output({ binary: true })` 序列化的值。可传入 `Buffer`/`Uint8Array` 或 `.bin` 文件路径。传入泛型参数可为结果指定类型。

```ts
// 通过泛型参数为结果指定类型
const restored = generator.deserialize<User>('./mocks/user.bin')

// 从 Buffer
const restored = generator.deserialize<User>(generator.serializeBinary(data))
```

## serializePortable / serializePortableAsync

[▶ 在 Playground 中试用](/zh/playground/?example=portable)

```ts
serializePortable(data: unknown, options?: PortableOptions): string
serializePortableAsync(data: unknown, options?: PortableOptions): Promise<string>
```

使用 [seroval](https://github.com/lxsmnsyc/seroval) 将数据序列化为**可移植的字符串**。与 `serializeBinary`（仅限 Node 的 `v8`）不同，其结果可在**任意 JS 运行时**之间往返——Node↔浏览器、浏览器↔浏览器。可保留 `Date`、`RegExp`、`Map`、`Set`、`BigInt`、`TypedArray`、`undefined`、`NaN`/`Infinity`、循环/共享引用，以及（通过内置插件）`URL`、`URLSearchParams`、`Headers`。

`File`、`Blob` 和 `FormData` 需异步读取字节，因此只能通过 `serializePortableAsync` 往返（同步版本遇到它们时会抛出明确错误，提示改用异步版本）。

`Symbol` **受支持**：注册表符号（`Symbol.for`）可保持身份往返；带描述的符号（`Symbol('x')`，例如 `z.symbol()`）按描述往返，并在**同一负载内**保持引用之间的身份一致。有两个固有限制：匿名符号的**跨运行时 `===` 身份**无法恢复（按定义它是唯一的），用作对象属性**键**的符号不会被保留（仅支持作为值、Map 键和 Set 成员）。实现注意：Symbol 以内部标记键编码，因此**唯一键**为该标记（`$$zod-v4-mocks/symbol$$`）的手工 plain object 在反序列化时会变成 `Symbol`。生成的 Mock 永远不会产生该键，所以这只影响手工构造的同形数据。

```ts
const data = generator.generate(schema)

// 跨运行时字符串
const str = generator.serializePortable(data)

// 用于嵌入 JSON 字段 / 环境变量 / 请求头的 base64
const b64 = generator.serializePortable(data, { base64: true })

// 异步 —— 当数据包含 File / Blob / FormData 时必需
const asyncStr = await generator.serializePortableAsync(data)
```

## deserializePortable

```ts
deserializePortable<T = unknown>(input: string, options?: PortableOptions): T
```

在任意 JS 运行时中还原由 `serializePortable` / `serializePortableAsync` 生成的值。若以 base64 编码，请传入 `{ base64: true }`；传入泛型参数可为结果指定类型。

```ts
const restored = generator.deserializePortable<User>(str)
const restoredFromB64 = generator.deserializePortable<User>(b64, { base64: true })
```

::: warning 还原时会被求值
`deserializePortable` 会对序列化字符串求值，因此只还原你自己生成的数据，切勿传入不可信的输入。
:::

### PortableOptions

```ts
type PortableOptions = {
  base64?: boolean // 将字符串进行 base64 编码（文本安全）；deserializePortable 需传入相同的标志
}
```

## output

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

// `binary: true` —— 对于 ts/js 输出，会写出一个轻量 ESM 包装器以及同名的
// <name>.bin（由 v8.serialize 生成）。包装器在导入时惰性反序列化该 .bin，
// 因此模块的用法与普通的 `import { mockData }` 一致，但可无损保留
// Date / Map / Set / RegExp / BigInt / TypedArray / undefined / 循环引用。
// 导出值的类型为 `unknown`；请在消费端进行类型断言，或在需要类型时直接使用 `deserialize<T>()`。
generator.output(data, { path: './mocks/user.ts', binary: true })
generator.output(data, { path: './mocks/user.js', binary: true })

// 自定义导出名称和头部/尾部
generator.output(data, {
  path: './mocks/user.ts',
  exportName: 'generatedMockData',
  header: "import type { User } from './types';",
  footer: 'export type MockData = typeof generatedMockData;',
})
```

### OutputOptions

```ts
type OutputOptions = {
  path?: string                    // 输出路径（默认: ./__generated__/generated-mock-data.<ext>）
  ext?: 'json' | 'js' | 'ts'       // 扩展名（从 path 推断，默认为 'ts'）
  exportName?: string              // 自定义导出变量名（默认: 'mockData'，仅 ts/js）
  header?: string                  // 添加到输出内容头部的字符串（JSON 格式时忽略）
  footer?: string                  // 添加到输出内容尾部的字符串（JSON 格式时忽略）
  binary?: boolean                 // 对于 ts/js，写出 <name>.bin 和一个反序列化它的包装器；JSON 时忽略
  portable?: boolean               // 仅 outputAsync：在 ts/js 中内联跨运行时表达式；支持 File/Blob/FormData 与循环引用；不支持 Symbol；JSON 时忽略
}
```

### 输出格式

| 扩展名 | 格式 | 特殊类型处理 |
|--------|------|-------------|
| `.ts` / `.js` | `export const <exportName> = ...` | 准确序列化 Date, BigInt, Map, Set, Symbol, File, Blob |
| `.ts` / `.js` + `binary: true` | ESM 包装器 + 同名 `.bin`（v8 结构化克隆）| 保留 Date, Map, Set, RegExp, BigInt, TypedArray, `undefined`, 循环引用。导出值类型为 `unknown`；请在消费端断言或使用 `deserialize<T>()` 指定类型。仅限 Node.js。 |
| `.ts` / `.js` + `portable: true`（**`outputAsync`**）| 内联 `export const <name> = <seroval 表达式>` | 跨运行时（Node↔浏览器），无 sibling 文件、无 consumer 依赖。保留 File/Blob/FormData 的**内容**、Date、Map、Set、BigInt、TypedArray、循环/共享引用。**不支持 `Symbol`。** |
| `.json` | JSON | Date 转为 ISO 字符串，BigInt 转为字符串，Map/Set/Symbol 会丢失信息（有警告）。`binary` 会被忽略。 |

::: warning JSON 输出时的数据丢失
如果将包含 JSON 无法表示的类型（BigInt, Symbol, Map, Set, File, Blob）的数据以 `.json` 格式输出，数据的准确性将会丢失。系统会输出警告信息，请考虑使用 `.ts` 或 `.js` 格式（可搭配 `binary: true`）。
:::

::: info `binary: true`（无损往返）
当设置 `binary: true` 时，`output()` 会写出两个文件：

- `<name>.bin` —— 原始的 `v8.serialize` Buffer。完美保留 Zod 能生成的所有值，包括循环引用。
- `<name>.ts` / `<name>.js` —— 一个轻量 ESM 包装器，在导入时惰性 `v8.deserialize` 同名 `.bin`，因此消费者只需 `import { mockData } from './user'`，无需关心二进制表示。

导出值的类型为 `unknown`；请在消费端断言，或在需要类型化的值时直接调用 `deserialize<T>('./user.bin')`（无需经过包装器）。`.bin` 文件名始终从包装器的基础名派生，无法单独自定义。包装器面向 ESM（`import.meta.dirname`），需要 Node.js 20.11+。
:::

## outputAsync

```ts
outputAsync(data: unknown, options?: OutputOptions): Promise<string>
```

`output` 的异步版本。`{ portable: true }` 需要它，因为要异步读取 `File`/`Blob`/`FormData` 的字节。非 portable 模式（`json` / `ts` / `js` / `binary`）的行为与 `output` 相同，只是用异步 fs 写入。返回输出路径。

在 `portable: true`（ts/js）下，它内联一个自包含、跨运行时的表达式——`export const <name> = <seroval 表达式>`——可在**任意 JS 运行时**（Node↔浏览器）通过普通 `import` 还原。与 `binary: true`（仅限 Node 的 v8 + sibling `.bin`）不同，**没有 sibling 文件，consumer 也无需任何依赖**，并且 `File`/`Blob`/`FormData` 会**连同内容**一起往返，同时保留 Date、Map、Set、BigInt、TypedArray、循环/共享引用。

```ts
const data = generator.generate(schema)

// 跨运行时、无损的 fixture（包含 File/Blob 内容）
const path = await generator.outputAsync(data, {
  path: './mocks/user.ts',
  portable: true,
})
// 在任何地方消费：import { mockData } from './mocks/user'
```

::: warning portable 输出不支持 Symbol
普通 `import` 没有 unbox 步骤，因此 `portable: true` 会**拒绝 `Symbol` 值**（否则会被还原为普通对象）。对于包含 Symbol 的数据，请使用不带 `portable` 的 `ext: 'ts'`/`'js'`（会输出 `Symbol(...)` 字面量），或使用 `serializePortable` / `deserializePortable` 字符串对。向同步的 `output()` 传入 `portable` 会抛出错误——请改用 `outputAsync`。
:::
