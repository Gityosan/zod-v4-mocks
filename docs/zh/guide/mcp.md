# MCP 服务器

`zod-v4-mocks` 提供了一个 [MCP (Model Context Protocol)](https://modelcontextprotocol.io) 服务器，让 AI 智能体可以从你的 Zod schema 发现并生成 mock 数据。它通过 **stdio** 进行 MCP 通信，并由 CLI 启动：

```bash
npx zod-v4-mocks mcp
```

## 在客户端中注册

将任意 MCP 客户端（Claude Desktop、Cursor 等）指向该包：

```json
{
  "mcpServers": {
    "zod-v4-mocks": {
      "command": "npx",
      "args": ["-y", "zod-v4-mocks", "mcp"]
    }
  }
}
```

路径是相对于服务器启动目录解析的，因此请将客户端的工作目录设为项目根目录（或向工具传入绝对路径）。

## Schema 约定：文件路径

Zod schema 无法从 JSON 忠实地重建，因此——与 [`generate` CLI 命令](/zh/guide/cli-and-config-file) 一样——schema 通过**文件路径**引用：一个导出 Zod schema 的 JS/ESM 模块，加上导出名称。TypeScript 模块无法直接加载，请先构建为 `.js` / `.mjs`。

工作目录中的 `zod-v4-mocks.config.{ts,js,mjs}` 会被自动发现（也可通过 `config` 指定），`profile` 用于选择 `base` / `cli` / `test`（默认 `cli`）。

## 工具

| 工具 | 输入 | 作用 |
|---|---|---|
| `usage` | — | 说明服务器、文件路径约定以及典型工作流。不确定时先调用它。 |
| `list_schemas` | `{ module }` | 列出模块导出的所有 Zod schema 名称，可用作 `export` 参数。 |
| `preflight` | `{ module, export?, config?, profile? }` | **不生成数据**地运行[预检（preflight）](/zh/guide/schema-support)，报告无法安全 mock 的结构（`error`）以及可能无法通过 `.parse()` / 已被自动修正的情况（`warning`）。 |
| `generate_mock` | `{ module, export?, count?, seed?, locale?, format?, pretty?, config?, profile? }` | 生成 mock 数据，以 `json`（默认）/ `ts` / `js` 返回。`count > 1` 返回数组，`seed` 使输出具有确定性。 |

## 典型工作流

1. **`list_schemas`** `{ module: "./dist/schemas.js" }` — 发现导出项。
2. **`preflight`** `{ module: "./dist/schemas.js", export: "User" }` — （可选）确认 schema 可以安全 mock。
3. **`generate_mock`** `{ module: "./dist/schemas.js", export: "User", count: 5, seed: 42 }` — 生成数据。

## 可选依赖

服务器基于 [`@modelcontextprotocol/sdk`](https://www.npmjs.com/package/@modelcontextprotocol/sdk)，它被声明为**可选依赖（optionalDependencies）**，从而不会强加给只需要核心生成器的用户。`npx` 会自动安装它；万一缺失，`mcp` 命令会打印安装说明：

```bash
npm install @modelcontextprotocol/sdk
```

## 下一步

- [CLI 与配置文件](/zh/guide/cli-and-config-file) - `generate` 命令与共享配置
- [Schema 支持情况](/zh/guide/schema-support) - preflight 检查的内容
- [API 参考](/zh/api/) - 方法级参考
