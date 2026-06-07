# MCP サーバー

`zod-v4-mocks` は [MCP (Model Context Protocol)](https://modelcontextprotocol.io) サーバーを提供しており、AI エージェントがあなたの Zod スキーマからモックデータを発見・生成できます。**stdio** で MCP を話し、CLI から起動します：

```bash
npx zod-v4-mocks mcp
```

## クライアントへの登録

MCP クライアント（Claude Desktop、Cursor など）からこのパッケージを指定します：

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

パスはサーバーを起動したディレクトリ基準で解決されるため、クライアントの作業ディレクトリをプロジェクトルートに設定するか、各ツールに絶対パスを渡してください。

## スキーマの契約：ファイルパス

Zod スキーマは JSON から忠実に復元できないため、[`generate` CLI コマンド](/ja/guide/cli-and-config-file) と同様に、スキーマは**ファイルパス**で参照します。Zod スキーマを export した JS/ESM モジュールと export 名を指定する形です。TypeScript モジュールは直接読み込めないので、先に `.js` / `.mjs` へビルドしてください。

作業ディレクトリにある `zod-v4-mocks.config.{ts,js,mjs}` は自動検出されます（`config` で明示も可）。`profile` で `base` / `cli` / `test` を選べます（デフォルト `cli`）。

## ツール

| ツール | 入力 | 内容 |
|---|---|---|
| `usage` | — | サーバーの概要、ファイルパス契約、典型的なワークフローを説明します。迷ったらまず呼びます。 |
| `list_schemas` | `{ module }` | モジュールが export している Zod スキーマ名を一覧します。`export` 引数として使えます。 |
| `preflight` | `{ module, export?, config?, profile? }` | データ生成せずに[事前チェック（preflight）](/ja/guide/schema-support)を実行し、安全にモックできない構造（`error`）や `.parse()` を通らない恐れ／自動修正された箇所（`warning`）を報告します。 |
| `generate_mock` | `{ module, export?, count?, seed?, locale?, format?, pretty?, config?, profile? }` | モックを生成し、`json`（デフォルト）/ `ts` / `js` で返します。`count > 1` で配列、`seed` で決定的な出力になります。 |

## 典型的なワークフロー

1. **`list_schemas`** `{ module: "./dist/schemas.js" }` — export を発見する。
2. **`preflight`** `{ module: "./dist/schemas.js", export: "User" }` — （任意）スキーマが安全にモックできるか確認する。
3. **`generate_mock`** `{ module: "./dist/schemas.js", export: "User", count: 5, seed: 42 }` — データを生成する。

## オプション依存

サーバーは [`@modelcontextprotocol/sdk`](https://www.npmjs.com/package/@modelcontextprotocol/sdk) を利用しますが、コアのジェネレータだけ使うユーザーに強制しないよう **optionalDependencies** として宣言しています。`npx` は自動でインストールします。万一見つからない場合、`mcp` コマンドはインストール手順を表示します：

```bash
npm install @modelcontextprotocol/sdk
```

## 次のステップ

- [CLI と設定ファイル](/ja/guide/cli-and-config-file) - `generate` コマンドと共有 config
- [スキーマ対応状況](/ja/guide/schema-support) - preflight が検査する内容
- [API リファレンス](/ja/api/) - メソッドレベルのリファレンス
