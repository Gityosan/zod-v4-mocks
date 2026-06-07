# MCP Server

`zod-v4-mocks` ships an [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server so AI agents can discover and generate mock data from your Zod schemas. It speaks MCP over **stdio** and is started through the CLI:

```bash
npx zod-v4-mocks mcp
```

## Registering with a client

Point any MCP client (Claude Desktop, Cursor, etc.) at the package:

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

Paths are resolved relative to the directory the server is started in, so set the client's working directory to your project root (or pass absolute paths to the tools).

## The schema contract: file paths

A Zod schema cannot be faithfully reconstructed from JSON, so — exactly like the [`generate` CLI command](/guide/cli-and-config-file) — schemas are referenced by **file path**: a JS/ESM module that exports Zod schemas, plus an export name. TypeScript modules are not loaded directly; build to `.js` / `.mjs` first.

A `zod-v4-mocks.config.{ts,js,mjs}` file in the working directory is auto-discovered (or pass `config`), and `profile` selects `base` / `cli` / `test` (default `cli`).

## Tools

| Tool | Input | What it does |
|---|---|---|
| `usage` | — | Explains the server, the file-path contract, and the typical workflow. Call this first if unsure. |
| `list_schemas` | `{ module }` | Lists the names of every Zod schema exported by a module. Use these as the `export` argument. |
| `preflight` | `{ module, export?, config?, profile? }` | Runs the [pre-flight schema walk](/guide/schema-support) **without generating data**, reporting constructs that cannot be safely mocked (`error`) or that may not satisfy `.parse()` / are auto-fixed (`warning`). |
| `generate_mock` | `{ module, export?, count?, seed?, locale?, format?, pretty?, config?, profile? }` | Generates mock data, returned as `json` (default), `ts`, or `js`. `count > 1` yields an array; `seed` makes output deterministic. |

## Typical workflow

1. **`list_schemas`** `{ module: "./dist/schemas.js" }` — discover the exports.
2. **`preflight`** `{ module: "./dist/schemas.js", export: "User" }` — (optional) confirm the schema is safe to mock.
3. **`generate_mock`** `{ module: "./dist/schemas.js", export: "User", count: 5, seed: 42 }` — produce the data.

## Optional dependency

The server is built on [`@modelcontextprotocol/sdk`](https://www.npmjs.com/package/@modelcontextprotocol/sdk), declared as an **optional dependency** so it isn't forced on users who only need the core generator. `npx` installs it automatically; if it is ever missing, the `mcp` command prints install instructions:

```bash
npm install @modelcontextprotocol/sdk
```

## Next Steps

- [CLI & Config File](/guide/cli-and-config-file) - The `generate` command and shared config
- [Schema Support](/guide/schema-support) - What preflight checks for
- [API Reference](/api/) - Method-level reference
