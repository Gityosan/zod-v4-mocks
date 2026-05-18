import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const CLI = resolve(__dirname, '..', 'dist', 'cli.js');
const HAS_BUILD = existsSync(CLI);

// All CLI tests are skipped when dist/cli.js is not present so that running
// `vitest` in a fresh checkout (before `pnpm build`) doesn't false-fail.
const itIfBuild = HAS_BUILD ? it : it.skip;

let tmp: string;
let schemasPath: string;

beforeAll(() => {
  tmp = mkdtempSync(join(tmpdir(), 'zod-v4-mocks-cli-'));
  schemasPath = join(tmp, 'schemas.mjs');
  writeFileSync(
    schemasPath,
    `import { z } from '${join(__dirname, '..', 'node_modules/zod/v4/index.js').replace(/\\/g, '/')}';
export const User = z.object({ id: z.uuid(), name: z.string(), email: z.email() });
export default User;
`,
  );
});

afterAll(() => {
  rmSync(tmp, { recursive: true, force: true });
});

function run(args: string[], cwd: string = tmp) {
  return spawnSync('node', [CLI, ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
  });
}

describe.runIf(HAS_BUILD)('CLI', () => {
  describe('basic invocation', () => {
    itIfBuild('--version prints a semver-like string', () => {
      const r = run(['--version']);
      expect(r.status).toBe(0);
      expect(r.stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
    });

    itIfBuild('--help prints usage', () => {
      const r = run(['--help']);
      expect(r.status).toBe(0);
      expect(r.stdout + r.stderr).toMatch(/zod-v4-mocks/);
    });
  });

  describe('generate command', () => {
    itIfBuild('produces a single JSON object by default', () => {
      const r = run(['generate', schemasPath, 'User', '-s', '42']);
      expect(r.status).toBe(0);
      const parsed = JSON.parse(r.stdout);
      expect(typeof parsed).toBe('object');
      expect(parsed).toHaveProperty('id');
      expect(parsed).toHaveProperty('email');
      expect(parsed.email).toMatch(/@/);
    });

    itIfBuild('--pretty produces multi-line JSON', () => {
      const r = run(['generate', schemasPath, 'User', '--pretty']);
      expect(r.status).toBe(0);
      expect(r.stdout).toContain('\n');
    });

    itIfBuild('--count > 1 produces an array', () => {
      const r = run(['generate', schemasPath, 'User', '-c', '3', '-s', '7']);
      expect(r.status).toBe(0);
      const parsed = JSON.parse(r.stdout);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(3);
    });

    itIfBuild('-o writes to file', () => {
      const out = join(tmp, 'users.json');
      const r = run(['generate', schemasPath, 'User', '-c', '2', '-o', out]);
      expect(r.status).toBe(0);
      expect(existsSync(out)).toBe(true);
      // file content is valid JSON of the requested length
      const data = JSON.parse(
        require('node:fs').readFileSync(out, 'utf8'),
      ) as unknown[];
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(2);
    });

    itIfBuild('rejects negative count with a clean error and exit code 1', () => {
      const r = run(['generate', schemasPath, 'User', '-c', '-1']);
      expect(r.status).toBe(1);
      // No raw stack trace — citty's default error path is bypassed.
      expect(r.stderr).not.toMatch(/at runCommand/);
      expect(r.stderr.toLowerCase()).toMatch(/count/);
    });

    itIfBuild('rejects an unknown profile', () => {
      const r = run(['generate', schemasPath, 'User', '--profile', 'xyz']);
      expect(r.status).toBe(1);
      expect(r.stderr.toLowerCase()).toMatch(/profile/);
    });

    itIfBuild('rejects a missing module path with exit 1', () => {
      const r = run(['generate', join(tmp, 'nope.mjs'), 'User']);
      expect(r.status).toBe(1);
      expect(r.stderr.toLowerCase()).toMatch(/not found/);
    });

    itIfBuild('refuses to load a .ts file directly', () => {
      const tsPath = join(tmp, 'schemas.ts');
      writeFileSync(tsPath, '// stub');
      const r = run(['generate', tsPath, 'User']);
      expect(r.status).toBe(1);
      expect(r.stderr.toLowerCase()).toMatch(/typescript/);
    });
  });

  describe('config file integration', () => {
    let cfgDir: string;
    beforeAll(() => {
      cfgDir = mkdtempSync(join(tmpdir(), 'zod-v4-mocks-cli-cfg-'));
      writeFileSync(
        join(cfgDir, 'zod-v4-mocks.config.mjs'),
        `export default {
           baseConfig: ({ initGenerator }) =>
             initGenerator({ seed: 1 }).supplyPath(['name'], 'BASE_NAME'),
           extend: {
             cliConfig: (base) => base.supplyPath(['email'], 'cli@x.com'),
             testConfig: (base) => base.supplyPath(['email'], 'test@x.com'),
           },
         };
`,
      );
    });
    afterAll(() => {
      rmSync(cfgDir, { recursive: true, force: true });
    });

    itIfBuild('auto-discovers config from cwd and applies cli profile', () => {
      const r = run(['generate', schemasPath, 'User'], cfgDir);
      expect(r.status).toBe(0);
      const parsed = JSON.parse(r.stdout);
      expect(parsed.name).toBe('BASE_NAME');
      expect(parsed.email).toBe('cli@x.com');
    });

    itIfBuild('--profile test applies the test extend', () => {
      const r = run(
        ['generate', schemasPath, 'User', '--profile', 'test'],
        cfgDir,
      );
      expect(r.status).toBe(0);
      const parsed = JSON.parse(r.stdout);
      expect(parsed.email).toBe('test@x.com');
    });

    itIfBuild('--profile base bypasses both extends', () => {
      const r = run(
        ['generate', schemasPath, 'User', '--profile', 'base'],
        cfgDir,
      );
      expect(r.status).toBe(0);
      const parsed = JSON.parse(r.stdout);
      expect(parsed.name).toBe('BASE_NAME');
      // base does not pin email, so it should NOT match either of the extends
      expect(parsed.email).not.toBe('cli@x.com');
      expect(parsed.email).not.toBe('test@x.com');
    });
  });
});

describe.runIf(HAS_BUILD)('CLI - additional options', () => {
  itIfBuild('--format json explicitly produces JSON', () => {
    const r = run(['generate', schemasPath, 'User', '-f', 'json', '-s', '3']);
    expect(r.status).toBe(0);
    expect(() => JSON.parse(r.stdout)).not.toThrow();
  });

  itIfBuild('--locale runs and produces valid output', () => {
    const r = run(['generate', schemasPath, 'User', '-l', 'ja', '-s', '1']);
    expect(r.status).toBe(0);
    expect(JSON.parse(r.stdout)).toHaveProperty('id');
  });

  itIfBuild('-f bin -o writes a non-empty binary file', () => {
    const out = join(tmp, 'users.bin');
    const r = run(['generate', schemasPath, 'User', '-f', 'bin', '-o', out]);
    expect(r.status).toBe(0);
    expect(existsSync(out)).toBe(true);
    expect(require('node:fs').statSync(out).size).toBeGreaterThan(0);
  });

  itIfBuild('--silent still writes the output file', () => {
    const out = join(tmp, 'silent.json');
    const r = run([
      'generate',
      schemasPath,
      'User',
      '-c',
      '3',
      '-o',
      out,
      '--silent',
    ]);
    expect(r.status).toBe(0);
    expect(existsSync(out)).toBe(true);
  });

  itIfBuild('rejects an unknown --format', () => {
    const r = run(['generate', schemasPath, 'User', '-f', 'xml']);
    expect(r.status).toBe(1);
    expect(r.stderr.toLowerCase()).toMatch(/format/);
  });
});
