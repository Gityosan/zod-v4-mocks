import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import {
  loadSchema,
  loadSchemaExports,
  resolveGenerator,
  serializeData,
  validateCount,
} from './runner';

function readPkgVersion(): string {
  try {
    const url = new URL('../package.json', import.meta.url);
    const pkg = JSON.parse(readFileSync(url, 'utf8')) as { version?: string };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

const TEXT_FORMATS = ['json', 'ts', 'js'] as const;

function textResult(text: string, isError = false) {
  return { content: [{ type: 'text' as const, text }], isError };
}

function errorResult(err: unknown) {
  return textResult(err instanceof Error ? err.message : String(err), true);
}

/**
 * Build the MCP server that exposes zod-v4-mocks over the Model Context
 * Protocol. Schemas are referenced by file path (a JS/ESM module exporting Zod
 * schemas) — the same contract as the `generate` CLI command — because Zod
 * schemas cannot be reconstructed faithfully from JSON alone.
 */
export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'zod-v4-mocks',
    version: readPkgVersion(),
  });

  server.registerTool(
    'generate_mock',
    {
      title: 'Generate mock data',
      description:
        'Generate mock data from a Zod v4 schema exported by a JS/ESM module. ' +
        'Returns the generated value(s) serialised in the requested format. ' +
        'TypeScript modules are not loaded directly — point at a compiled .js ' +
        'file. Use list_schemas first to discover available exports.',
      inputSchema: {
        module: z
          .string()
          .describe(
            'Path (absolute or relative to the server cwd) to a JS/ESM module exporting a Zod schema.',
          ),
        export: z
          .string()
          .optional()
          .describe(
            'Named export to use. Defaults to the module\'s default export.',
          ),
        count: z
          .number()
          .int()
          .min(0)
          .default(1)
          .describe('Number of items. count>1 yields an array; count=1 a single value.'),
        seed: z
          .number()
          .optional()
          .describe('Random seed for deterministic output (default 1).'),
        locale: z
          .string()
          .optional()
          .describe('Faker locale, e.g. ja, en, de.'),
        format: z
          .enum(TEXT_FORMATS)
          .default('json')
          .describe('Output serialisation format.'),
        pretty: z
          .boolean()
          .default(true)
          .describe('Pretty-print JSON output.'),
        config: z
          .string()
          .optional()
          .describe(
            'Path to a zod-v4-mocks.config.{ts,js,mjs} file. Auto-discovered from cwd when omitted.',
          ),
        profile: z
          .enum(['base', 'cli', 'test'])
          .optional()
          .describe('Profile to use from the config file (default cli).'),
      },
    },
    async (args) => {
      try {
        validateCount(args.count);
        const schema = await loadSchema(args.module, args.export);
        const gen = await resolveGenerator({
          seed: args.seed,
          locale: args.locale,
          config: args.config,
          profile: args.profile,
        });
        const data =
          args.count > 1
            ? gen.generateMany(schema, args.count)
            : gen.generate(schema);
        return textResult(serializeData(gen, data, args.format, args.pretty));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    'list_schemas',
    {
      title: 'List Zod schemas in a module',
      description:
        'List the names of every export in a JS/ESM module that is a Zod ' +
        'schema. Use the returned names as the "export" argument to generate_mock.',
      inputSchema: {
        module: z
          .string()
          .describe(
            'Path (absolute or relative to the server cwd) to a JS/ESM module.',
          ),
      },
    },
    async (args) => {
      try {
        const exports = await loadSchemaExports(args.module);
        if (exports.length === 0) {
          return textResult(`No Zod schema exports found in ${args.module}`);
        }
        return textResult(exports.join('\n'));
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  return server;
}

/** Create the server and connect it to a stdio transport. Resolves once the
 * transport is connected; the process stays alive serving requests. */
export async function startMcpServer(): Promise<void> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
