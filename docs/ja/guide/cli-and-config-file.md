# CLI と共有 config ファイル

`zod-v4-mocks` は手軽な生成のための CLI と、CLI と実行時コード（テスト・スクリプト）で共有できる config ファイル機構を提供します。

## CLI

`zod-v4-mocks` バイナリは JS/ESM モジュールを読み込み、Zod スキーマの export を選び、モックデータを表示／書き出します。

```bash
# 1件を標準出力（pretty JSON）
npx zod-v4-mocks generate ./schemas.js User --pretty

# 50件をファイル出力
npx zod-v4-mocks generate ./schemas.js User --count 50 --output users.json

# シードとロケールを指定
npx zod-v4-mocks generate ./schemas.js User --seed 42 --locale ja
```

TypeScript で書かれたスキーマモジュールの場合は `tsx` 経由で実行します：

```bash
npx tsx node_modules/zod-v4-mocks/dist/cli.js generate ./schemas.ts User -c 10
```

### オプション

| フラグ | 説明 |
|---|---|
| `-c, --count <n>` | 生成数。`count > 1` で配列、`count = 1` で単一値。 |
| `-s, --seed <n>` | 乱数シード（既定 `1`） |
| `-o, --output <path>` | ファイルへ出力。形式は拡張子から推測 |
| `-f, --format <fmt>` | 出力形式: `json` / `ts` / `js` / `bin`。拡張子より優先 |
| `-l, --locale <loc>` | Faker ロケール（`ja`, `en`, `de` 等） |
| `--pretty` | 標準出力時に JSON を整形 |
| `--silent` | プログレスや情報メッセージを抑制 |
| `--config <path>` | 明示的な config ファイル指定（未指定時は自動探索） |
| `--profile <name>` | プロファイル: `base` / `cli` / `test`（既定 `cli`） |

ファイルに書き出す大きなバッチでは進捗を表示します（標準出力時は出力ストリーム破壊を避けるため進捗表示は行いません）。

## 共有 config ファイル

`zod-v4-mocks.config.{ts,js,mjs}` ファイルでプロジェクト共通のジェネレータ設定を表現し、CLI **と**実行時コードの両方で同じ設定を使えます。読み込みは [`c12`](https://github.com/unjs/c12) に乗っているので、TypeScript の config も追加ツール無しで動作し、作業ディレクトリから自動探索されます。

### 3 レイヤー構成

`defineMockConfig` は必須の `baseConfig` ファクトリと、任意の拡張 `extend.cliConfig` / `extend.testConfig` を受け取ります。各 extend はベースのジェネレータを受け取り、追加設定済みのジェネレータを返します。

```ts
// zod-v4-mocks.config.ts
import { defineMockConfig } from 'zod-v4-mocks/config'
import { UserId, FIXED_UUID } from './src/schemas/ids'

export default defineMockConfig({
  // プロジェクト全体のデフォルト（全プロファイルで適用）
  baseConfig: ({ initGenerator }) =>
    initGenerator({ locale: 'ja', keyMapping: 'auto' })
      .supplyRef(UserId, FIXED_UUID),

  extend: {
    // CLI 実行時にだけ追加
    cliConfig: (base) =>
      base.updateConfig({ seed: 1 })
        .supplyPath(['createdAt'], new Date('2024-01-01')),

    // テストから利用するときにだけ追加
    testConfig: (base) =>
      base.override((schema, opts) => /* テスト用ルール */ undefined),
  },
})
```

各レイヤーの使い分け：

| レイヤー | 入れるべきもの |
|---|---|
| `baseConfig` | `locale`, `customMockKey`, `consistentKey`, プロジェクト共通の `supplyRef`, `keyMapping` の方針 |
| `extend.cliConfig` | CLI 用の都合（固定シードや書式ヒント等） |
| `extend.testConfig` | 横断的なテスト規約（`override` ルール、追加の `supplyRef`）。**個別**テスト固有のオーバーライドは、ファクトリで取得したジェネレータにテスト内でチェーンする |

### CLI からの読み込み

CLI は作業ディレクトリから `zod-v4-mocks.config.{ts,js,mjs}` を自動探索し、既定で `cli` プロファイルを適用します。`--config <path>` と `--profile <name>` で上書き可能。

### テスト / Node コードからの読み込み

```ts
import { loadConfig } from 'zod-v4-mocks/config'

const { createBase, createCli, createTest } = await loadConfig()
// createBase / createCli / createTest はファクトリ。呼ぶたびに新しい
// MockGenerator インスタンスを返す。

beforeEach(() => {
  // テスト固有の変化は、共有 base + testConfig の上にチェーンする
  gen = createTest()
    .updateConfig({ seed: testCase.seed })
    .supplyPath(['user', 'email'], 'override@x')
})
```

`loadConfig` は config ファイルが見つからず明示指定もされていない場合 `null` を返すので、プロジェクトに config があってもなくても同じコードパスが動きます。

### なぜ「ファクトリ」が重要か

チェーン API はジェネレータを mutate します（`gen.supplyPath(...)` は同じインスタンスを返す）。もし `loadConfig` が単一の共有インスタンスを返したら、あるテストで追加した supply が次のテストに漏れます。`create*` ファクトリは呼び出すたびに元の `baseConfig`（と該当の `extend`）からジェネレータを再構築するので、各呼び出しは独立したインスタンスを返します。

```ts
const a = createTest().supplyPath(['note'], 'A')
const b = createTest()                  // b は ['note'] -> 'A' を見ない
```

### API リファレンス

```ts
import {
  defineMockConfig,
  loadConfig,
  getProfileFactory,
  type ConfigProfile,
  type DefineMockConfigInput,
  type LoadedMockConfig,
} from 'zod-v4-mocks/config'

defineMockConfig({
  baseConfig: ({ initGenerator, z }) => MockGenerator,
  extend?: {
    cliConfig?: (base: MockGenerator) => MockGenerator,
    testConfig?: (base: MockGenerator) => MockGenerator,
  },
})

loadConfig(options?: { cwd?: string; configFile?: string })
  : Promise<LoadedMockConfig | null>

// LoadedMockConfig:
// { configFile?, raw, createBase, createCli, createTest }

getProfileFactory(loaded: LoadedMockConfig, profile?: ConfigProfile)
  : () => MockGenerator
```

## 次のステップ

- [設定](/ja/guide/configuration) - `MockConfig` の全オプション
- [カスタムジェネレータ](/ja/guide/custom-generator) - `supply` / `supplyRef` / `supplyPath` / `override`
- [API リファレンス](/ja/api/) - メソッド別の詳細
