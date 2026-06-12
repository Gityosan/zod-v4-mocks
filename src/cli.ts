#!/usr/bin/env node
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { defineCommand, runMain } from 'citty';
import { consola } from 'consola';
import logUpdate from 'log-update';
import type { ConfigProfile } from './config';
import type { MockGenerator } from './mock-generator';
import {
  inferFormat,
  isProfile,
  jsonReplacer,
  loadSchema,
  PROFILES,
  readPkgVersion,
  resolveGenerator,
  validateCount,
} from './runner';

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
        'Output format: json | ts | js | bin (overrides extension).',
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
  validateCount(count, args.count);

  const profile = (args.profile ?? 'cli') as ConfigProfile;
  if (!isProfile(profile)) {
    throw new Error(
      `--profile must be one of ${PROFILES.join('|')} (got: ${args.profile})`,
    );
  }

  const seed = args.seed !== undefined ? Number(args.seed) : undefined;
  if (seed !== undefined && !Number.isFinite(seed)) {
    throw new Error(`--seed must be a number (got: ${args.seed})`);
  }

  const schema = await loadSchema(args.module, args.export);

  const gen: MockGenerator = await resolveGenerator({
    seed,
    locale: args.locale,
    config: args.config,
    profile,
    onConfigInfo: args.silent ? undefined : (msg) => consola.info(msg),
  });

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
  } else {
    gen.output(data, { path: absOut });
  }
  consola.success(`Wrote ${absOut}`);
}

const mcpCmd = defineCommand({
  meta: {
    name: 'mcp',
    description:
      'Start a Model Context Protocol (MCP) server over stdio so agents ' +
      'can generate mocks from your Zod schemas.',
  },
  async run() {
    // The MCP SDK is an optional dependency (it pulls a large tree that core
    // library users don't need), and it is heavy to load, so it is imported
    // lazily only when this command runs.
    try {
      const { startMcpServer } = await import('./mcp');
      await startMcpServer();
    } catch (err) {
      if (
        err instanceof Error &&
        /Cannot find (module|package)|ERR_MODULE_NOT_FOUND/.test(err.message) &&
        err.message.includes('modelcontextprotocol')
      ) {
        consola.error(
          'The MCP server requires "@modelcontextprotocol/sdk".\n' +
            'Install it alongside zod-v4-mocks:\n' +
            '  npm install @modelcontextprotocol/sdk',
        );
        process.exit(1);
      }
      consola.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  },
});

const main = defineCommand({
  meta: {
    name: 'zod-v4-mocks',
    version: readPkgVersion(),
    description: 'Generate mock data from Zod v4 schemas.',
  },
  subCommands: {
    generate: generateCmd,
    mcp: mcpCmd,
  },
});

void runMain(main);
