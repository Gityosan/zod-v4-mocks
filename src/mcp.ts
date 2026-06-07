import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  loadSchema,
  loadSchemaExports,
  readPkgVersion,
  resolveGenerator,
  serializeData,
  validateCount,
} from './runner';

const TEXT_FORMATS = ['json', 'ts', 'js'] as const;

const USAGE = `zod-v4-mocks MCP server — generate mock data from your Zod v4 schemas.

Schemas are referenced by FILE PATH (a JS/ESM module exporting Zod schemas),
the same contract as the \`zod-v4-mocks generate\` CLI. A Zod schema cannot be
reconstructed from JSON, so you point at a module instead of pasting a schema.
TypeScript files are not loaded directly — build to .js/.mjs first.

Typical workflow:
  1. list_schemas { module } — discover the schema exports in a file.
  2. preflight  { module, export } — (optional) check a schema is safe to mock.
  3. generate_mock { module, export, count, seed } — produce the data.

Tools:
  • list_schemas  — names of every Zod schema export in a module.
  • preflight     — report constructs that cannot be safely mocked (errors)
                    or that may not pass .parse() / are auto-fixed (warnings),
                    without generating anything.
  • generate_mock — generate mock data. count>1 yields an array; \`seed\` makes
                    output deterministic; \`format\` is json | ts | js.
  • usage         — this message.

Config: a zod-v4-mocks.config.{ts,js,mjs} file in the cwd is auto-discovered
(or pass \`config\`), and \`profile\` selects base | cli | test (default cli).
Paths are resolved relative to the directory the server was started in.`;

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

  server.registerTool(
    'preflight',
    {
      title: 'Preflight-check a schema',
      description:
        'Run the pre-flight schema walk on a Zod schema WITHOUT generating ' +
        'data. Reports constructs the generator cannot safely mock ' +
        '(error level) and ones that may not satisfy .parse() or that are ' +
        'auto-fixed (warning level). Use this to validate a schema before ' +
        'generate_mock. Returns "no issues" when the schema is clean.',
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
            'Named export to check. Defaults to the module\'s default export.',
          ),
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
        const schema = await loadSchema(args.module, args.export);
        const gen = await resolveGenerator({
          config: args.config,
          profile: args.profile,
        });
        // Force the check on even if a config file disabled it — running
        // preflight is the whole point of this tool. supply*/override
        // registrations are preserved across updateConfig.
        gen.updateConfig({ preflightCheck: true });
        const diagnostics = gen.preflight(schema);
        if (diagnostics.length === 0) {
          return textResult('✓ No preflight issues found.');
        }
        const errors = diagnostics.filter((d) => d.level === 'error').length;
        const warnings = diagnostics.length - errors;
        const summary =
          `${diagnostics.length} issue(s): ` +
          `${errors} error(s), ${warnings} warning(s)`;
        const lines = diagnostics.map(
          (d) => `[${d.level}] ${d.path}: ${d.message}`,
        );
        // Not an MCP error — diagnostics are the payload, not a tool failure.
        return textResult(`${summary}\n\n${lines.join('\n')}`);
      } catch (err) {
        return errorResult(err);
      }
    },
  );

  server.registerTool(
    'usage',
    {
      title: 'How to use this server',
      description:
        'Explain what this MCP server does and how to use its tools ' +
        '(the file-path schema contract, the typical workflow, config ' +
        'discovery). Call this first if you are unsure how to proceed.',
      inputSchema: {},
    },
    () => textResult(USAGE),
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
