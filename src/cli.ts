#!/usr/bin/env node
 
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, extname, isAbsolute, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import { initGenerator } from './mock-generator';
import type { LocaleType, MockConfig } from './type';

type Cli = {
  command?: string;
  modulePath?: string;
  exportName?: string;
  count: number;
  seed?: number;
  output?: string;
  format?: 'json' | 'ts' | 'js' | 'bin';
  locale?: LocaleType;
  pretty: boolean;
  help: boolean;
  version: boolean;
};

function parseArgs(argv: string[]): Cli {
  const out: Cli = { count: 1, pretty: false, help: false, version: false };
  let positional = 0;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case '-h':
      case '--help':
        out.help = true;
        break;
      case '-V':
      case '--version':
        out.version = true;
        break;
      case '-c':
      case '--count':
        out.count = Number(next());
        break;
      case '-s':
      case '--seed':
        out.seed = Number(next());
        break;
      case '-o':
      case '--output':
        out.output = next();
        break;
      case '-f':
      case '--format':
        out.format = next() as Cli['format'];
        break;
      case '-l':
      case '--locale':
        out.locale = next() as LocaleType;
        break;
      case '--pretty':
        out.pretty = true;
        break;
      default:
        if (a.startsWith('-')) {
          throw new Error(`Unknown option: ${a}`);
        }
        if (positional === 0) out.command = a;
        else if (positional === 1) out.modulePath = a;
        else if (positional === 2) out.exportName = a;
        positional++;
    }
  }
  return out;
}

const HELP = `zod-v4-mocks <command> [options]

Commands:
  generate <module> [export]   Generate mocks from a Zod schema export.
                                If [export] is omitted, the module's default
                                export is used.

Options:
  -c, --count <n>     Number of items (default 1).
                      With count=1, output is a single value.
                      With count>1, output is an array.
  -s, --seed <n>      Random seed (default 1).
  -o, --output <path> Write to file. Format inferred from extension.
                      Without -o, writes JSON to stdout.
  -f, --format <fmt>  json | ts | js | bin (overrides extension).
  -l, --locale <loc>  Faker locale (e.g. ja, en, de).
  --pretty            Pretty-print JSON to stdout.
  -h, --help          Show this help.
  -V, --version       Show version.

Notes:
  - Module must be JavaScript/ESM. For TypeScript schemas, run via tsx:
      npx tsx node_modules/zod-v4-mocks/dist/cli.js generate ./schemas.ts User

Examples:
  zod-v4-mocks generate ./schemas.js User -c 10 -o users.json
  zod-v4-mocks generate ./schemas.js User --pretty
`;

async function loadSchema(
  modulePath: string,
  exportName: string | undefined,
): Promise<z.ZodType> {
  const abs = isAbsolute(modulePath) ? modulePath : resolve(process.cwd(), modulePath);
  if (!existsSync(abs)) {
    throw new Error(`Module not found: ${abs}`);
  }
  const ext = extname(abs);
  if (ext === '.ts' || ext === '.tsx' || ext === '.mts' || ext === '.cts') {
    throw new Error(
      `TypeScript files are not loaded directly. Run via tsx, e.g.:\n` +
        `  npx tsx node_modules/zod-v4-mocks/dist/cli.js ...`,
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

function isZodSchema(value: unknown): value is z.ZodType {
  return (
    typeof value === 'object' &&
    value !== null &&
    '_zod' in value &&
    'parse' in value &&
    typeof (value as { parse: unknown }).parse === 'function'
  );
}

function inferFormat(out: Cli): 'json' | 'ts' | 'js' | 'bin' {
  if (out.format) return out.format;
  if (out.output) {
    const ext = extname(out.output).slice(1).toLowerCase();
    if (ext === 'json' || ext === 'ts' || ext === 'js' || ext === 'bin') return ext;
  }
  return 'json';
}

async function runGenerate(opts: Cli): Promise<void> {
  if (!opts.modulePath) {
    throw new Error('Missing <module> argument. Run with --help for usage.');
  }
  const schema = await loadSchema(opts.modulePath, opts.exportName);

  const config: Partial<MockConfig> = {};
  if (opts.seed !== undefined) config.seed = opts.seed;
  if (opts.locale) config.locale = opts.locale;

  const gen = initGenerator(config);
  const data = opts.count > 1 ? gen.generateMany(schema, opts.count) : gen.generate(schema);

  const fmt = inferFormat(opts);

  if (!opts.output) {
    if (fmt === 'bin') {
      process.stdout.write(gen.serializeBinary(data));
      return;
    }
    if (fmt === 'json') {
      console.log(JSON.stringify(data, jsonReplacer, opts.pretty ? 2 : 0));
      return;
    }
    console.log(gen.serialize(data));
    return;
  }

  const absOut = isAbsolute(opts.output) ? opts.output : resolve(process.cwd(), opts.output);
  const dir = dirname(absOut);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  if (fmt === 'bin') {
    gen.output(data, { path: absOut, binary: true });
  } else if (fmt === 'json') {
    gen.output(data, { path: absOut });
  } else {
    gen.output(data, { path: absOut });
  }
  console.error(`Wrote ${absOut}`);
}

function jsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'symbol') return value.toString();
  if (typeof value === 'undefined') return null;
  if (value instanceof Map) return Object.fromEntries(value);
  if (value instanceof Set) return Array.from(value);
  return value;
}

async function readVersion(): Promise<string> {
  try {
    const { readFileSync } = await import('node:fs');
    const url = new URL('../package.json', import.meta.url);
    const pkg = JSON.parse(readFileSync(url, 'utf8')) as { version?: string };
    return pkg.version ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

async function main(): Promise<void> {
  let opts: Cli;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error((e as Error).message);
    console.error('\n' + HELP);
    process.exit(2);
  }

  if (opts.version) {
    console.log(await readVersion());
    return;
  }
  if (opts.help || !opts.command) {
    console.log(HELP);
    return;
  }

  try {
    if (opts.command === 'generate') {
      await runGenerate(opts);
      return;
    }
    console.error(`Unknown command: ${opts.command}\n`);
    console.error(HELP);
    process.exit(2);
  } catch (err) {
    console.error('Error:', (err as Error).message);
    process.exit(1);
  }
}

void main();
