import { existsSync } from 'node:fs';
import { extname, isAbsolute, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { z } from 'zod';
import {
  type ConfigProfile,
  getProfileFactory,
  loadConfig,
  type LoadedMockConfig,
} from './config';
import { initGenerator, type MockGenerator } from './mock-generator';
import type { LocaleType, MockConfig } from './type';

/**
 * Shared building blocks for the CLI and the MCP server: locating a Zod schema
 * inside a JS/ESM module, resolving a generator from CLI flags + config file,
 * and serialising the result. Keeping these here (rather than in `cli.ts`,
 * which calls `runMain` on import) lets `mcp.ts` reuse them without triggering
 * the CLI entrypoint.
 */

export const FORMATS = ['json', 'ts', 'js', 'bin'] as const;
export type Format = (typeof FORMATS)[number];

export const PROFILES = ['base', 'cli', 'test'] as const;

export function isFormat(value: string): value is Format {
  return (FORMATS as readonly string[]).includes(value);
}

export function isProfile(value: string): value is ConfigProfile {
  return (PROFILES as readonly string[]).includes(value);
}

export function isZodSchema(value: unknown): value is z.ZodType {
  return (
    typeof value === 'object' &&
    value !== null &&
    '_zod' in value &&
    'parse' in value &&
    typeof (value as { parse: unknown }).parse === 'function'
  );
}

function resolveModulePath(modulePath: string): string {
  const abs = isAbsolute(modulePath)
    ? modulePath
    : resolve(process.cwd(), modulePath);
  if (!existsSync(abs)) {
    throw new Error(`Module not found: ${abs}`);
  }
  const ext = extname(abs);
  if (ext === '.ts' || ext === '.tsx' || ext === '.mts' || ext === '.cts') {
    throw new Error(
      'TypeScript files are not loaded directly. Run via tsx, e.g.:\n' +
        '  npx tsx node_modules/zod-v4-mocks/dist/cli.js generate ./schemas.ts User',
    );
  }
  return abs;
}

async function importModule(modulePath: string): Promise<Record<string, unknown>> {
  const abs = resolveModulePath(modulePath);
  const url = pathToFileURL(abs).href;
  return (await import(url)) as Record<string, unknown>;
}

export async function loadSchema(
  modulePath: string,
  exportName: string | undefined,
): Promise<z.ZodType> {
  const mod = await importModule(modulePath);
  const value = exportName ? mod[exportName] : (mod.default ?? mod);
  if (!value) {
    throw new Error(
      `Export "${exportName ?? 'default'}" not found in ${modulePath}`,
    );
  }
  if (!isZodSchema(value)) {
    throw new Error(
      `Export "${exportName ?? 'default'}" is not a Zod schema (missing _zod / .parse).`,
    );
  }
  return value;
}

/**
 * Names of every export in the module that looks like a Zod schema. Used by the
 * MCP `list_schemas` tool so an agent can discover what's available before
 * calling `generate_mock`.
 */
export async function loadSchemaExports(
  modulePath: string,
): Promise<string[]> {
  const mod = await importModule(modulePath);
  return Object.keys(mod).filter((key) => isZodSchema(mod[key]));
}

export function inferFormat(
  format: string | undefined,
  output: string | undefined,
): Format {
  if (format) {
    if (isFormat(format)) return format;
    throw new Error(
      `Unknown format: ${format} (expected: ${FORMATS.join('|')})`,
    );
  }
  if (output) {
    const ext = extname(output).slice(1).toLowerCase();
    if (isFormat(ext)) return ext;
  }
  return 'json';
}

export function jsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'symbol') return value.toString();
  if (typeof value === 'undefined') return null;
  if (value instanceof Map) return Object.fromEntries(value);
  if (value instanceof Set) return Array.from(value);
  return value;
}

export interface ResolveGeneratorOptions {
  seed?: number;
  locale?: string;
  config?: string;
  profile?: ConfigProfile;
  /** Called with an informational line when a config file is used. */
  onConfigInfo?: (message: string) => void;
}

/**
 * Build a {@link MockGenerator} from flag-style options, layering an
 * auto-discovered (or explicit) config file underneath, exactly like the CLI's
 * `generate` command. CLI flags (`seed`, `locale`) override config-file values.
 */
export async function resolveGenerator(
  opts: ResolveGeneratorOptions,
): Promise<MockGenerator> {
  const profile: ConfigProfile = opts.profile ?? 'cli';

  const flagConfig: Partial<MockConfig> = {};
  if (opts.seed !== undefined) {
    if (!Number.isFinite(opts.seed)) {
      throw new Error(`seed must be a number (got: ${opts.seed})`);
    }
    flagConfig.seed = opts.seed;
  }
  if (opts.locale) flagConfig.locale = opts.locale as LocaleType;

  const loaded: LoadedMockConfig | null = await loadConfig({
    configFile: opts.config,
  });

  if (loaded) {
    opts.onConfigInfo?.(
      `Using config: ${loaded.configFile ?? '(unknown)'} (profile: ${profile})`,
    );
    const gen = getProfileFactory(loaded, profile)();
    if (Object.keys(flagConfig).length > 0) gen.updateConfig(flagConfig);
    return gen;
  }
  return initGenerator(flagConfig);
}

export function validateCount(count: number, raw?: string): void {
  if (!Number.isFinite(count) || count < 0 || !Number.isInteger(count)) {
    throw new Error(
      `count must be a non-negative integer (got: ${raw ?? count})`,
    );
  }
}

/**
 * Serialise generated data to a string in one of the textual formats. `bin` is
 * intentionally excluded — binary output is handled separately by callers that
 * can write bytes.
 */
export function serializeData(
  gen: MockGenerator,
  data: unknown,
  format: Exclude<Format, 'bin'>,
  pretty: boolean,
): string {
  if (format === 'json') {
    return JSON.stringify(data, jsonReplacer, pretty ? 2 : 0);
  }
  return gen.serialize(data);
}
