import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  defineMockConfig,
  getProfileFactory,
  loadConfig,
} from '../src/config';

const Schema = z.object({ name: z.string(), email: z.string() });

let tmp: string;
const FIXED_NAME = 'BASE_NAME';
const CLI_EMAIL = 'cli@example.com';
const TEST_EMAIL = 'test@example.com';

beforeAll(() => {
  tmp = mkdtempSync(join(tmpdir(), 'zod-v4-mocks-cfg-'));

  // Plain object form — defineMockConfig is just an identity helper, so
  // we can skip the import in test fixtures and avoid resolver gymnastics.
  const configBody = `
export default {
  baseConfig: ({ initGenerator }) =>
    initGenerator({ seed: 42 }).supplyPath(['name'], '${FIXED_NAME}'),
  extend: {
    cliConfig: (base) => base.supplyPath(['email'], '${CLI_EMAIL}'),
    testConfig: (base) => base.supplyPath(['email'], '${TEST_EMAIL}'),
  },
};
`;
  writeFileSync(join(tmp, 'zod-v4-mocks.config.mjs'), configBody);
});

afterAll(() => {
  rmSync(tmp, { recursive: true, force: true });
});

describe('defineMockConfig', () => {
  it('returns its input unchanged (identity helper)', () => {
    const cfg = defineMockConfig({
      baseConfig: ({ initGenerator }) => initGenerator(),
    });
    expect(typeof cfg.baseConfig).toBe('function');
    expect(cfg.extend).toBeUndefined();
  });
});

describe('loadConfig: discovery + profiles', () => {
  it('returns null when no config is found', async () => {
    const empty = mkdtempSync(join(tmpdir(), 'zod-v4-mocks-empty-'));
    try {
      const result = await loadConfig({ cwd: empty });
      expect(result).toBeNull();
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });

  it('discovers config from cwd', async () => {
    const result = await loadConfig({ cwd: tmp });
    expect(result).not.toBeNull();
    expect(result!.configFile).toMatch(/zod-v4-mocks\.config\.mjs$/);
  });

  it('createBase applies only baseConfig', async () => {
    const result = await loadConfig({ cwd: tmp });
    const gen = result!.createBase();
    const out = gen.generate(Schema);
    expect(out.name).toBe(FIXED_NAME);
    // base does not pin email, so it should NOT match either of the extend values
    expect(out.email).not.toBe(CLI_EMAIL);
    expect(out.email).not.toBe(TEST_EMAIL);
  });

  it('createCli applies base + cliConfig', async () => {
    const result = await loadConfig({ cwd: tmp });
    const out = result!.createCli().generate(Schema);
    expect(out.name).toBe(FIXED_NAME);
    expect(out.email).toBe(CLI_EMAIL);
  });

  it('createTest applies base + testConfig', async () => {
    const result = await loadConfig({ cwd: tmp });
    const out = result!.createTest().generate(Schema);
    expect(out.name).toBe(FIXED_NAME);
    expect(out.email).toBe(TEST_EMAIL);
  });

  it('factories return fresh instances (no cross-call mutation)', async () => {
    const result = await loadConfig({ cwd: tmp });
    const SchemaPlus = z.object({
      name: z.string(),
      email: z.string(),
      note: z.string(),
    });
    const a = result!.createTest().supplyPath(['note'], 'NOTE_A');
    const b = result!.createTest();
    // a's added supplyPath must not leak into b
    expect(a.generate(SchemaPlus).note).toBe('NOTE_A');
    expect(b.generate(SchemaPlus).note).not.toBe('NOTE_A');
    // base supplies on both still work
    expect(a.generate(SchemaPlus).name).toBe(FIXED_NAME);
    expect(b.generate(SchemaPlus).name).toBe(FIXED_NAME);
  });

  it('explicit configFile path works', async () => {
    const result = await loadConfig({
      configFile: join(tmp, 'zod-v4-mocks.config.mjs'),
    });
    expect(result).not.toBeNull();
    expect(result!.createCli().generate(Schema).email).toBe(CLI_EMAIL);
  });

  it('explicit missing configFile throws', async () => {
    await expect(
      loadConfig({ configFile: join(tmp, 'nope.config.mjs') }),
    ).rejects.toThrow();
  });
});

describe('getProfileFactory', () => {
  it('selects the correct factory by name', async () => {
    const result = await loadConfig({ cwd: tmp });
    const baseGen = getProfileFactory(result!, 'base')();
    const cliGen = getProfileFactory(result!, 'cli')();
    const testGen = getProfileFactory(result!, 'test')();

    expect(baseGen.generate(Schema).name).toBe(FIXED_NAME);
    expect(cliGen.generate(Schema).email).toBe(CLI_EMAIL);
    expect(testGen.generate(Schema).email).toBe(TEST_EMAIL);
  });

  it('defaults to cli profile', async () => {
    const result = await loadConfig({ cwd: tmp });
    const gen = getProfileFactory(result!)();
    expect(gen.generate(Schema).email).toBe(CLI_EMAIL);
  });
});

describe('loadConfig: configs without extend', () => {
  let tmp2: string;
  beforeAll(() => {
    tmp2 = mkdtempSync(join(tmpdir(), 'zod-v4-mocks-noext-'));
    writeFileSync(
      join(tmp2, 'zod-v4-mocks.config.mjs'),
      `export default {
         baseConfig: ({ initGenerator }) =>
           initGenerator({ seed: 1 }).supplyPath(['name'], 'BASE_ONLY'),
       };
`,
    );
  });
  afterAll(() => {
    rmSync(tmp2, { recursive: true, force: true });
  });

  it('createCli falls back to base when extend.cliConfig is absent', async () => {
    const result = await loadConfig({ cwd: tmp2 });
    expect(result!.createCli().generate(Schema).name).toBe('BASE_ONLY');
  });

  it('createTest falls back to base when extend.testConfig is absent', async () => {
    const result = await loadConfig({ cwd: tmp2 });
    expect(result!.createTest().generate(Schema).name).toBe('BASE_ONLY');
  });
});

describe('loadConfig: invalid configs', () => {
  it('throws when an explicit configFile lacks baseConfig', async () => {
    const tmp3 = mkdtempSync(join(tmpdir(), 'zod-v4-mocks-bad-'));
    try {
      const file = join(tmp3, 'bad.config.mjs');
      writeFileSync(file, `export default { something: 'else' };`);
      await expect(loadConfig({ configFile: file })).rejects.toThrow(
        /baseConfig/,
      );
    } finally {
      rmSync(tmp3, { recursive: true, force: true });
    }
  });

  it('returns null on auto-discovery when the file has no baseConfig', async () => {
    const tmp4 = mkdtempSync(join(tmpdir(), 'zod-v4-mocks-noBase-'));
    try {
      writeFileSync(
        join(tmp4, 'zod-v4-mocks.config.mjs'),
        `export default { something: 'else' };`,
      );
      const result = await loadConfig({ cwd: tmp4 });
      expect(result).toBeNull();
    } finally {
      rmSync(tmp4, { recursive: true, force: true });
    }
  });
});

describe('loadConfig: factory propagates exceptions', () => {
  let tmp5: string;
  beforeAll(() => {
    tmp5 = mkdtempSync(join(tmpdir(), 'zod-v4-mocks-throw-'));
    writeFileSync(
      join(tmp5, 'zod-v4-mocks.config.mjs'),
      `export default {
         baseConfig: () => { throw new Error('boom'); },
       };
`,
    );
  });
  afterAll(() => {
    rmSync(tmp5, { recursive: true, force: true });
  });

  it('exceptions in baseConfig are surfaced when a factory is invoked', async () => {
    const result = await loadConfig({ cwd: tmp5 });
    expect(() => result!.createBase()).toThrow('boom');
  });
});

describe('loadConfig: path resolution and file types', () => {
  it('resolves a relative configFile against cwd', async () => {
    const result = await loadConfig({
      cwd: tmp,
      configFile: 'zod-v4-mocks.config.mjs',
    });
    expect(result).not.toBeNull();
    expect(result!.createCli().generate(Schema).email).toBe(CLI_EMAIL);
  });

  it('loads a TypeScript config file', async () => {
    const tsDir = mkdtempSync(join(tmpdir(), 'zod-v4-mocks-ts-'));
    try {
      writeFileSync(
        join(tsDir, 'zod-v4-mocks.config.ts'),
        `export default {
           baseConfig: ({ initGenerator }: { initGenerator: any }) =>
             initGenerator({ seed: 3 }).supplyPath(['name'], 'TS_OK'),
         };
`,
      );
      const result = await loadConfig({ cwd: tsDir });
      expect(result).not.toBeNull();
      expect(result!.createBase().generate(Schema).name).toBe('TS_OK');
    } finally {
      rmSync(tsDir, { recursive: true, force: true });
    }
  });
});
