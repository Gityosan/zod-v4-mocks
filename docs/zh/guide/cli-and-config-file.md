# CLI 与共享配置文件

`zod-v4-mocks` 提供了一个用于即席生成的小型 CLI，以及一份 CLI 和运行时代码（测试、脚本）共享的配置文件机制。

## CLI

`zod-v4-mocks` 命令会加载一个 JS/ESM 模块，选取 Zod Schema 导出，并打印（或写入）Mock 数据。

```bash
# 单个 mock 输出到标准输出（pretty JSON）
npx zod-v4-mocks generate ./schemas.js User --pretty

# 50 个 mock 写入文件
npx zod-v4-mocks generate ./schemas.js User --count 50 --output users.json

# 指定 seed 和 locale
npx zod-v4-mocks generate ./schemas.js User --seed 42 --locale ja
```

TypeScript Schema 模块需要通过 `tsx` 执行：

```bash
npx tsx node_modules/zod-v4-mocks/dist/cli.js generate ./schemas.ts User -c 10
```

### 选项

| 标志 | 说明 |
|---|---|
| `-c, --count <n>` | 生成数量。`count > 1` 返回数组；`count = 1` 返回单个值 |
| `-s, --seed <n>` | 随机种子（默认 `1`） |
| `-o, --output <path>` | 写入文件。格式从扩展名推断 |
| `-f, --format <fmt>` | 输出格式：`json` / `ts` / `js` / `bin`。优先于扩展名 |
| `-l, --locale <loc>` | Faker locale（如 `ja`、`en`、`de`） |
| `--pretty` | 标准输出时美化 JSON |
| `--silent` | 抑制进度和信息消息 |
| `--config <path>` | 显式指定配置文件路径。未指定时自动探测 |
| `--profile <name>` | 配置 profile：`base` / `cli` / `test`（默认 `cli`） |

向文件写入大量数据时，CLI 会显示进度（标准输出时不会绘制 —— 那样会破坏输出流）。

## 共享配置文件

`zod-v4-mocks.config.{ts,js,mjs}` 文件用于表达项目级别的生成器配置，可同时被 CLI **和**运行时代码使用。加载由 [`c12`](https://github.com/unjs/c12) 处理，因此 TypeScript 配置无需额外工具即可使用，文件会从工作目录自动探测。

### 三层结构

`defineMockConfig` 接收一个必填的工厂 `baseConfig` 和两个可选的扩展回调（`extend.cliConfig` / `extend.testConfig`）。每个扩展接收基础生成器，返回增强后的生成器。

```ts
// zod-v4-mocks.config.ts
import { defineMockConfig } from 'zod-v4-mocks/config'
import { UserId, FIXED_UUID } from './src/schemas/ids'

export default defineMockConfig({
  // 项目级默认（所有 profile 都会应用）
  baseConfig: ({ initGenerator }) =>
    initGenerator({ locale: 'ja', keyMapping: 'auto' })
      .supplyRef(UserId, FIXED_UUID),

  extend: {
    // 通过 CLI 运行时应用
    cliConfig: (base) =>
      base.updateConfig({ seed: 1 })
        .supplyPath(['createdAt'], new Date('2024-01-01')),

    // 从测试中调用时应用
    testConfig: (base) =>
      base.override((schema, opts) => /* 仅测试时的规则 */ undefined),
  },
})
```

各层的用途：

| 层 | 应放入的内容 |
|---|---|
| `baseConfig` | `locale`、`customMockKey`、`consistentKey`、项目级 `supplyRef`、`keyMapping` 策略 |
| `extend.cliConfig` | 只对即席 CLI 生成有意义的默认值（固定 seed、输出格式提示） |
| `extend.testConfig` | 跨测试约定（`override` 规则、额外的 `supplyRef`）—— 单个测试特有的覆盖应在测试内链式追加到返回的生成器上 |

### 从 CLI 加载

CLI 会从工作目录自动探测 `zod-v4-mocks.config.{ts,js,mjs}`，默认应用 `cli` profile。可通过 `--config <path>` 和 `--profile <name>` 覆盖。

### 从测试 / Node 代码加载

```ts
import { loadConfig } from 'zod-v4-mocks/config'

const { createBase, createCli, createTest } = await loadConfig()
// createBase / createCli / createTest 都是工厂 —— 每次调用都会返回新的
// MockGenerator 实例。

beforeEach(() => {
  // 单个测试的差异在共享 base + testConfig 之上链式追加
  gen = createTest()
    .updateConfig({ seed: testCase.seed })
    .supplyPath(['user', 'email'], 'override@x')
})
```

未找到配置文件且未显式指定时，`loadConfig` 返回 `null`，因此同一段代码无论项目有无配置文件都能运行。

### "工厂"为什么重要

链式 API 会改变生成器实例（`gen.supplyPath(...)` 返回同一实例）。如果 `loadConfig` 返回单一共享实例，一个测试中追加的 supply 会泄漏到下一个测试。`create*` 工厂在每次调用时从原始 `baseConfig`（加上相应的 `extend`）重新构建生成器，因此每次返回的都是隔离的实例。

```ts
const a = createTest().supplyPath(['note'], 'A')
const b = createTest()                  // b 看不到 ['note'] -> 'A'
```

### API 参考

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

## 下一步

- [配置](/zh/guide/configuration) - `MockConfig` 全部选项
- [自定义生成器](/zh/guide/custom-generator) - `supply` / `supplyRef` / `supplyPath` / `override`
- [API 参考](/zh/api/) - 方法级参考
