import { isAbsolute, resolve } from 'node:path';
import { loadConfig as c12LoadConfig } from 'c12';
import { z } from 'zod';
import { initGenerator, type MockGenerator } from './mock-generator';

export type DefineMockConfigContext = {
  initGenerator: typeof initGenerator;
  z: typeof z;
};

export type DefineMockConfigInput = {
  baseConfig: (ctx: DefineMockConfigContext) => MockGenerator;
  extend?: {
    cliConfig?: (base: MockGenerator) => MockGenerator;
    testConfig?: (base: MockGenerator) => MockGenerator;
  };
};

/**
 * Identity helper that adds type inference to a project's
 * `zod-v4-mocks.config.{ts,js,mjs}` file.
 *
 * @example
 * ```ts
 * import { defineMockConfig } from 'zod-v4-mocks/config';
 *
 * export default defineMockConfig({
 *   baseConfig: ({ initGenerator }) =>
 *     initGenerator({ locale: 'ja' }).supplyRef(UserId, FIXED_UUID),
 *   extend: {
 *     cliConfig: (base) => base.updateConfig({ seed: 1 }),
 *     testConfig: (base) => base.supplyPath(['createdAt'], new Date(0)),
 *   },
 * });
 * ```
 */
export function defineMockConfig(
  input: DefineMockConfigInput,
): DefineMockConfigInput {
  return input;
}

export type LoadMockConfigOptions = {
  /** Working directory used for auto-discovery. Default `process.cwd()`. */
  cwd?: string;
  /** Explicit config file path. When set, missing files throw. */
  configFile?: string;
};

export type LoadedMockConfig = {
  /** Absolute path of the resolved config file, when one was found. */
  configFile?: string;
  /** Raw `defineMockConfig` input, in case callers want to inspect it. */
  raw: DefineMockConfigInput;
  /** Build a fresh generator from `baseConfig` only. */
  createBase: () => MockGenerator;
  /** Build a fresh generator from `baseConfig` then `extend.cliConfig`. */
  createCli: () => MockGenerator;
  /** Build a fresh generator from `baseConfig` then `extend.testConfig`. */
  createTest: () => MockGenerator;
};

/**
 * Load and resolve a `zod-v4-mocks.config.{ts,js,mjs}` file via `c12`.
 *
 * Returns three factories — `createBase`, `createCli`, `createTest` —
 * each rebuilding a fresh `MockGenerator` from the project's
 * `baseConfig` (and the matching `extend` step, when present). Calling
 * factories repeatedly is intended: chained API methods mutate the
 * generator, so each call returns an isolated instance.
 *
 * Returns `null` when no config file is found and none was explicitly
 * requested.
 */
export async function loadConfig(
  options: LoadMockConfigOptions = {},
): Promise<LoadedMockConfig | null> {
  const cwd = options.cwd ?? process.cwd();
  const configFile = options.configFile
    ? isAbsolute(options.configFile)
      ? options.configFile
      : resolve(cwd, options.configFile)
    : undefined;

  const result = await c12LoadConfig<Partial<DefineMockConfigInput>>({
    name: 'zod-v4-mocks',
    cwd,
    configFile,
    configFileRequired: !!configFile,
    rcFile: false,
    globalRc: false,
    packageJson: false,
    omit$Keys: true,
  });

  const config = result.config as Partial<DefineMockConfigInput> | null;
  if (!config || typeof config.baseConfig !== 'function') {
    if (configFile) {
      throw new Error(
        `Config file "${configFile}" did not export a defineMockConfig() result with a baseConfig.`,
      );
    }
    return null;
  }

  const fullConfig = config as DefineMockConfigInput;
  const ctx: DefineMockConfigContext = { initGenerator, z };
  const make = (
    extender?: (base: MockGenerator) => MockGenerator,
  ): (() => MockGenerator) => {
    return () => {
      const base = fullConfig.baseConfig(ctx);
      return extender ? extender(base) : base;
    };
  };

  return {
    configFile: result.configFile,
    raw: fullConfig,
    createBase: make(),
    createCli: make(fullConfig.extend?.cliConfig),
    createTest: make(fullConfig.extend?.testConfig),
  };
}

export type ConfigProfile = 'base' | 'cli' | 'test';

/**
 * Pick a factory by profile name. Defaults to `cli`.
 */
export function getProfileFactory(
  loaded: LoadedMockConfig,
  profile: ConfigProfile = 'cli',
): () => MockGenerator {
  switch (profile) {
    case 'base':
      return loaded.createBase;
    case 'cli':
      return loaded.createCli;
    case 'test':
      return loaded.createTest;
  }
}
