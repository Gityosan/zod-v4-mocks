#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, extname, isAbsolute, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { defineCommand, runMain } from 'citty';
import { consola } from 'consola';
import logUpdate from 'log-update';
import type { z } from 'zod';
import {
  type ConfigProfile,
  getProfileFactory,
  loadConfig,
  type LoadedMockConfig,
} from './config';
import { initGenerator, type MockGenerator } from './mock-generator';
import type { LocaleType, MockConfig } from './type';

const FORMATS = ['json', 'ts', 'js', 'bin', 'graft'] as const;
type Format = (typeof FORMATS)[number];

const PROFILES = ['base', 'cli', 'test'] as const;

function isFormat(value: string): value is Format {
  return (FORMATS as readonly string[]).includes(value);
}

function readPkgVersion(): string {
  try {
    const url = new URL('../package.json', import.meta.url);
    const pkg = JSON.parse(readFileSync(url, 'utf8')) as { version?: string };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function isZodSchema(value: unknown): value is z.ZodType {
  return (
    typeof value === 'object' &&
    value !== null &&
    '_zod' in value &&
    'parse' in value &&
    typeof (value as { parse: unknown }).parse === 'function'
  );
}

async function loadSchema(
  modulePath: string,
  exportName: string | undefined,
): Promise<z.ZodType> {
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
  const url = pathToFileURL(abs).href;
  const mod = (await import(url)) as Record<string, unknown>;
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

function inferFormat(
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

function jsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'symbol') return value.toString();
  if (typeof value === 'undefined') return null;
  if (value instanceof Map) return Object.fromEntries(value);
  if (value instanceof Set) return Array.from(value);
  return value;
}

const PROGRESS_THRESHOLD = 10;

const generateCmd = defineCommand({
  meta: {
    name: 'generate',
    description: 'Generate mock data from a Zod schema export.',
  },
  args: {
    module: {
      type: 'positional',
      description: 'Path to a JS/ESM module exporting a Zod schema.',
      required: true,
    },
    export: {
      type: 'positional',
      description:
        'Named export to use. Defaults to the module\'s default export.',
      required: false,
    },
    count: {
      type: 'string',
      alias: 'c',
      description:
        'Number of items. count>1 yields an array; count=1 yields a single value.',
      default: '1',
    },
    seed: {
      type: 'string',
      alias: 's',
      description: 'Random seed (default 1).',
    },
    output: {
      type: 'string',
      alias: 'o',
      description: 'Write to file. Format inferred from extension.',
    },
    format: {
      type: 'string',
      alias: 'f',
      description:
        'Output format: json | ts | js | bin (v8) | graft (cross-language) (overrides extension).',
    },
    locale: {
      type: 'string',
      alias: 'l',
      description: 'Faker locale (e.g. ja, en, de).',
    },
    pretty: {
      type: 'boolean',
      description: 'Pretty-print JSON output to stdout.',
      default: false,
    },
    silent: {
      type: 'boolean',
      description: 'Suppress progress and informational messages.',
      default: false,
    },
    config: {
      type: 'string',
      description:
        'Path to a zod-v4-mocks.config.{ts,js,mjs} file. Auto-discovered from cwd when omitted.',
    },
    profile: {
      type: 'string',
      description:
        'Profile to use from the config file: base | cli | test (default cli).',
      default: 'cli',
    },
  },
  async run({ args }) {
    if (args.silent) consola.level = 0;
    try {
      await runGenerate(args);
    } catch (err) {
      consola.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  },
});

async function runGenerate(args: {
  module: string;
  export?: string;
  count: string;
  seed?: string;
  output?: string;
  format?: string;
  locale?: string;
  pretty: boolean;
  silent: boolean;
  config?: string;
  profile?: string;
}): Promise<void> {
  const count = Number(args.count);
  if (!Number.isFinite(count) || count < 0 || !Number.isInteger(count)) {
    throw new Error(`--count must be a non-negative integer (got: ${args.count})`);
  }

  const profile = (args.profile ?? 'cli') as ConfigProfile;
  if (!(PROFILES as readonly string[]).includes(profile)) {
    throw new Error(
      `--profile must be one of ${PROFILES.join('|')} (got: ${args.profile})`,
    );
  }

  const flagConfig: Partial<MockConfig> = {};
  if (args.seed !== undefined) {
    const n = Number(args.seed);
    if (!Number.isFinite(n)) {
      throw new Error(`--seed must be a number (got: ${args.seed})`);
    }
    flagConfig.seed = n;
  }
  if (args.locale) flagConfig.locale = args.locale as LocaleType;

  const schema = await loadSchema(args.module, args.export);

  const loaded: LoadedMockConfig | null = await loadConfig({
    configFile: args.config,
  });

  let gen: MockGenerator;
  if (loaded) {
    if (!args.silent) {
      consola.info(
        `Using config: ${loaded.configFile ?? '(unknown)'} (profile: ${profile})`,
      );
    }
    gen = getProfileFactory(loaded, profile)();
    if (Object.keys(flagConfig).length > 0) {
      // CLI flags override config-file values for the well-known knobs
      // they cover (seed, locale).
      gen.updateConfig(flagConfig);
    }
  } else {
    gen = initGenerator(flagConfig);
  }

  let data: unknown;
  if (count > 1) {
    // Progress is drawn only when writing to a file (drawing on stdout
    // would corrupt the output) and the batch is large enough to matter.
    const showProgress =
      !args.silent && !!args.output && count >= PROGRESS_THRESHOLD;
    if (showProgress) {
      const factory = gen.factory(schema);
      const arr: unknown[] = [];
      for (let i = 0; i < count; i++) {
        arr.push(factory.next());
        if ((i + 1) % 25 === 0 || i === count - 1) {
          logUpdate(`Generating ${i + 1}/${count}`);
        }
      }
      logUpdate.clear();
      data = arr;
    } else {
      data = gen.generateMany(schema, count);
    }
  } else {
    data = gen.generate(schema);
  }

  const fmt = inferFormat(args.format, args.output);

  if (!args.output) {
    if (fmt === 'bin') {
      process.stdout.write(gen.serializeBinary(data));
      return;
    }
    if (fmt === 'graft') {
      process.stdout.write(gen.serializeGraft(data));
      return;
    }
    if (fmt === 'json') {
      process.stdout.write(
        JSON.stringify(data, jsonReplacer, args.pretty ? 2 : 0) + '\n',
      );
      return;
    }
    process.stdout.write(gen.serialize(data) + '\n');
    return;
  }

  const absOut = isAbsolute(args.output)
    ? args.output
    : resolve(process.cwd(), args.output);
  const dir = dirname(absOut);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  if (fmt === 'bin') {
    gen.output(data, { path: absOut, binary: true });
  } else if (fmt === 'graft') {
    gen.output(data, { path: absOut, binary: 'graft' });
  } else {
    gen.output(data, { path: absOut });
  }
  consola.success(`Wrote ${absOut}`);
}

const main = defineCommand({
  meta: {
    name: 'zod-v4-mocks',
    version: readPkgVersion(),
    description: 'Generate mock data from Zod v4 schemas.',
  },
  subCommands: {
    generate: generateCmd,
  },
});

void runMain(main);
