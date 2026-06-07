import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const CLI = resolve(__dirname, '..', '..', 'dist', 'cli.js');
const ZOD = join(__dirname, '..', '..', 'node_modules/zod/v4/index.js').replace(
  /\\/g,
  '/',
);
const HAS_BUILD = existsSync(CLI);
const HAS_SDK = existsSync(
  resolve(__dirname, '..', '..', 'node_modules/@modelcontextprotocol/sdk'),
);
const CAN_RUN = HAS_BUILD && HAS_SDK;

let tmp: string;
let schemasPath: string;

beforeAll(() => {
  tmp = mkdtempSync(join(tmpdir(), 'zod-v4-mocks-mcp-'));
  schemasPath = join(tmp, 'schemas.mjs');
  writeFileSync(
    schemasPath,
    `import { z } from '${ZOD}';
export const User = z.object({ id: z.uuid(), name: z.string(), email: z.email() });
export const Post = z.object({ title: z.string() });
export const notASchema = 42;
export default User;
`,
  );
});

afterAll(() => {
  rmSync(tmp, { recursive: true, force: true });
});

interface JsonRpcResponse {
  id?: number;
  result?: { content?: { type: string; text: string }[]; isError?: boolean };
  error?: unknown;
}

/**
 * Spawn the built `mcp` server, perform the initialize handshake, send each
 * request, and resolve with the responses keyed by id once all expected ids
 * have been seen (or the timeout elapses).
 */
function driveServer(
  requests: { id: number; method: string; params?: unknown }[],
): Promise<Map<number, JsonRpcResponse>> {
  return new Promise((resolvePromise, reject) => {
    const child: ChildProcessWithoutNullStreams = spawn(
      'node',
      [CLI, 'mcp'],
      { cwd: tmp, env: { ...process.env, NO_COLOR: '1' } },
    ) as ChildProcessWithoutNullStreams;

    const responses = new Map<number, JsonRpcResponse>();
    const expected = new Set(requests.map((r) => r.id));
    let buf = '';
    const send = (msg: unknown) => child.stdin.write(JSON.stringify(msg) + '\n');

    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`MCP server timed out; got ids ${[...responses.keys()]}`));
    }, 15000);

    const finish = () => {
      clearTimeout(timer);
      child.kill();
      resolvePromise(responses);
    };

    child.stdout.on('data', (chunk: Buffer) => {
      buf += chunk.toString();
      let nl: number;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line) continue;
        const msg = JSON.parse(line) as JsonRpcResponse;
        if (typeof msg.id === 'number' && expected.has(msg.id)) {
          responses.set(msg.id, msg);
          if (responses.size === expected.size) finish();
        }
      }
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    // Handshake, then fire the requests once initialized.
    send({
      jsonrpc: '2.0',
      id: 0,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'vitest', version: '1.0.0' },
      },
    });
    setTimeout(() => {
      send({ jsonrpc: '2.0', method: 'notifications/initialized' });
      for (const r of requests) {
        send({ jsonrpc: '2.0', id: r.id, method: r.method, params: r.params });
      }
    }, 300);
  });
}

const text = (res?: JsonRpcResponse) => res?.result?.content?.[0]?.text ?? '';

describe.runIf(CAN_RUN)('MCP server', () => {
  it('lists the generate_mock and list_schemas tools', async () => {
    const res = await driveServer([{ id: 1, method: 'tools/list' }]);
    const names = (
      res.get(1)?.result as unknown as { tools: { name: string }[] }
    ).tools.map((t) => t.name);
    expect(names).toContain('generate_mock');
    expect(names).toContain('list_schemas');
  });

  it('list_schemas returns only Zod schema exports', async () => {
    const res = await driveServer([
      {
        id: 1,
        method: 'tools/call',
        params: { name: 'list_schemas', arguments: { module: schemasPath } },
      },
    ]);
    const lines = text(res.get(1)).split('\n').sort();
    // `default` is the default export (also a schema); `notASchema` is excluded.
    expect(lines).toEqual(['Post', 'User', 'default']);
  });

  it('generate_mock produces a deterministic array for a given seed', async () => {
    const call = {
      method: 'tools/call',
      params: {
        name: 'generate_mock',
        arguments: { module: schemasPath, export: 'User', count: 2, seed: 7 },
      },
    };
    const a = await driveServer([{ id: 1, ...call }]);
    const b = await driveServer([{ id: 1, ...call }]);
    const parsed = JSON.parse(text(a.get(1))) as unknown[];
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toHaveProperty('email');
    // Same seed => identical output across server runs.
    expect(text(a.get(1))).toBe(text(b.get(1)));
  });

  it('reports a clean error for a missing export', async () => {
    const res = await driveServer([
      {
        id: 1,
        method: 'tools/call',
        params: {
          name: 'generate_mock',
          arguments: { module: schemasPath, export: 'Nope' },
        },
      },
    ]);
    expect(res.get(1)?.result?.isError).toBe(true);
    expect(text(res.get(1))).toMatch(/not found/i);
  });
});
