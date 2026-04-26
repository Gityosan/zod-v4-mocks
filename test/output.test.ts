import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { initGenerator } from '../src';

const testOutputDir = './__test_output__';

afterEach(() => {
  if (existsSync(testOutputDir)) {
    rmSync(testOutputDir, { recursive: true });
  }
  // Clean up default output directory
  if (existsSync('./__generated__')) {
    rmSync('./__generated__', { recursive: true });
  }
});

describe('initGenerator (functional base API)', () => {
  describe('register', () => {
    it('consistent generator', () => {
      const generator = initGenerator({ consistentKey: 'name' });
      const UserId = z.uuid().meta({ name: 'UserId' });
      const userSchema = z.object({
        id: UserId,
        name: z.string(),
      });
      const schema = z.array(
        z.object({
          userId: UserId,
          user: userSchema,
        }),
      );
      const result = generator.register([UserId]).generate(schema);

      expect(Array.isArray(result)).toBe(true);
      // @ts-ignore
      expect(result.length).toBeGreaterThan(0);

      // @ts-ignore
      result.forEach((item) => {
        expect(item).toHaveProperty('userId');
        expect(item).toHaveProperty('user');
        expect(item.user).toHaveProperty('id');
        expect(item.userId).toBe(item.user.id);
      });
    });
  });

  describe('output', () => {
    it('outputs JSON file and returns path', () => {
      const generator = initGenerator();
      const schema = z.object({ name: z.string() });
      const data = generator.generate(schema);
      const outputPath = `${testOutputDir}/test.json`;

      const result = generator.output(data, { path: outputPath });

      expect(result).toBe(outputPath);
      expect(existsSync(outputPath)).toBe(true);
      const content = JSON.parse(readFileSync(outputPath, 'utf-8'));
      expect(content).toHaveProperty('name');
    });

    it('outputs TS file with Date serialization', () => {
      const generator = initGenerator();
      const schema = z.object({ name: z.string(), createdAt: z.date() });
      const data = generator.generate(schema);
      const outputPath = `${testOutputDir}/test.ts`;

      const result = generator.output(data, { path: outputPath });

      expect(result).toBe(outputPath);
      expect(existsSync(outputPath)).toBe(true);
      const content = readFileSync(outputPath, 'utf-8');
      expect(content).toContain('export const mockData');
      expect(content).toContain('new Date(');
    });

    it('outputs JS file with Date serialization', () => {
      const generator = initGenerator();
      const schema = z.object({ name: z.string(), createdAt: z.date() });
      const data = generator.generate(schema);
      const outputPath = `${testOutputDir}/test.js`;

      const result = generator.output(data, { path: outputPath });

      expect(result).toBe(outputPath);
      expect(existsSync(outputPath)).toBe(true);
      const content = readFileSync(outputPath, 'utf-8');
      expect(content).toContain('export const mockData');
      expect(content).toContain('new Date(');
    });

    it('outputs JSON file with Date as ISO string', () => {
      const generator = initGenerator();
      const schema = z.object({ name: z.string(), createdAt: z.date() });
      const data = generator.generate(schema);
      const outputPath = `${testOutputDir}/date.json`;

      generator.output(data, { path: outputPath });

      const content = JSON.parse(readFileSync(outputPath, 'utf-8'));
      expect(typeof content.createdAt).toBe('string');
      expect(content.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('outputs TS file with combined Date and BigInt', () => {
      const generator = initGenerator();
      const schema = z.object({
        createdAt: z.date(),
        count: z.bigint(),
      });
      const data = generator.generate(schema);
      const outputPath = `${testOutputDir}/combined.ts`;

      generator.output(data, { path: outputPath });

      const content = readFileSync(outputPath, 'utf-8');
      expect(content).toContain('new Date(');
      expect(content).toMatch(/\d+n/);
    });

    it('outputs JS file with combined Date and BigInt', () => {
      const generator = initGenerator();
      const schema = z.object({
        createdAt: z.date(),
        count: z.bigint(),
      });
      const data = generator.generate(schema);
      const outputPath = `${testOutputDir}/combined.js`;

      generator.output(data, { path: outputPath });

      const content = readFileSync(outputPath, 'utf-8');
      expect(content).toContain('new Date(');
      expect(content).toMatch(/\d+n/);
    });

    it('outputs JSON file with combined Date and BigInt', () => {
      const generator = initGenerator();
      const schema = z.object({
        createdAt: z.date(),
        count: z.bigint(),
      });
      const data = generator.generate(schema);
      const outputPath = `${testOutputDir}/combined.json`;

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      generator.output(data, { path: outputPath });

      const content = JSON.parse(readFileSync(outputPath, 'utf-8'));
      expect(typeof content.createdAt).toBe('string');
      expect(content.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(typeof content.count).toBe('string');
      expect(content.count).toMatch(/^\d+$/);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Some data types cannot be accurately represented in JSON'),
      );

      warnSpy.mockRestore();
    });

    it('outputs to default path when no path specified', () => {
      const generator = initGenerator();
      const data = { test: 'value' };
      const defaultPath = './__generated__/generated-mock-data.ts';

      const result = generator.output(data);

      expect(result).toBe(defaultPath);
      expect(existsSync(defaultPath)).toBe(true);
    });

    it('works with multiGenerate result', () => {
      const generator = initGenerator();
      const schemas = {
        user: z.object({ name: z.string() }),
        post: z.object({ title: z.string() }),
      };
      const data = generator.multiGenerate(schemas);
      const outputPath = `${testOutputDir}/multi.ts`;

      generator.output(data, { path: outputPath });

      const content = readFileSync(outputPath, 'utf-8');
      expect(content).toContain('"user"');
      expect(content).toContain('"post"');
    });

    it('outputs TS file with BigInt serialization', () => {
      const generator = initGenerator();
      const schema = z.object({ count: z.bigint() });
      const data = generator.generate(schema);
      const outputPath = `${testOutputDir}/bigint.ts`;

      generator.output(data, { path: outputPath });

      const content = readFileSync(outputPath, 'utf-8');
      expect(content).toContain('export const mockData');
      expect(content).toMatch(/\d+n/);
    });

    it('outputs JS file with BigInt serialization', () => {
      const generator = initGenerator();
      const schema = z.object({ count: z.bigint() });
      const data = generator.generate(schema);
      const outputPath = `${testOutputDir}/bigint.js`;

      generator.output(data, { path: outputPath });

      const content = readFileSync(outputPath, 'utf-8');
      expect(content).toContain('export const mockData');
      expect(content).toMatch(/\d+n/);
    });

    it('outputs JSON file with BigInt converted to string', () => {
      const generator = initGenerator();
      const schema = z.object({ count: z.bigint() });
      const data = generator.generate(schema);
      const outputPath = `${testOutputDir}/bigint.json`;

      generator.output(data, { path: outputPath });

      const content = JSON.parse(readFileSync(outputPath, 'utf-8'));
      expect(typeof content.count).toBe('string');
      expect(content.count).toMatch(/^\d+$/);
    });

    it('warns when BigInt is converted to string in JSON output', () => {
      const generator = initGenerator();
      const schema = z.object({ count: z.bigint(), amount: z.bigint() });
      const data = generator.generate(schema);
      const outputPath = `${testOutputDir}/bigint-warn.json`;

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      generator.output(data, { path: outputPath });

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Some data types cannot be accurately represented in JSON'),
      );
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('count'));
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('amount'));

      warnSpy.mockRestore();
    });

    it('does not warn when no BigInt in JSON output', () => {
      const generator = initGenerator();
      const schema = z.object({ name: z.string() });
      const data = generator.generate(schema);
      const outputPath = `${testOutputDir}/no-bigint.json`;

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      generator.output(data, { path: outputPath });

      expect(warnSpy).not.toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it('outputs TS file with File serialization', () => {
      const generator = initGenerator();
      const schema = z.object({
        id: z.number(),
        file: z.file(),
        name: z.string(),
      });
      const data = generator.generate(schema);
      const outputPath = `${testOutputDir}/file.ts`;

      generator.output(data, { path: outputPath });

      const content = readFileSync(outputPath, 'utf-8');
      expect(content).toContain('export const mockData =');
      expect(content).toContain('new File(');
      expect(content).toMatch(/new File\(\[\], "[^"]+"\)/);
    });

    it('outputs JS file with File serialization', () => {
      const generator = initGenerator();
      const schema = z.object({
        file: z.file(),
      });
      const data = generator.generate(schema);
      const outputPath = `${testOutputDir}/file.js`;

      generator.output(data, { path: outputPath });

      const content = readFileSync(outputPath, 'utf-8');
      expect(content).toContain('export const mockData =');
      expect(content).toContain('new File(');
    });

    it('outputs TS file with Blob serialization', () => {
      const generator = initGenerator();
      const data = { blob: new Blob([], { type: 'text/plain' }) };
      const outputPath = `${testOutputDir}/blob.ts`;

      generator.output(data, { path: outputPath });

      const content = readFileSync(outputPath, 'utf-8');
      expect(content).toContain('export const mockData =');
      expect(content).toContain('new Blob(');
      expect(content).toContain('{ type: "text/plain" }');
    });
  });
});

describe('output - exportName option', () => {
  it('uses custom exportName in TS output', () => {
    const generator = initGenerator();
    const data = { name: 'test' };
    const outputPath = `${testOutputDir}/custom-name.ts`;

    generator.output(data, { path: outputPath, exportName: 'generatedMockData' });

    const content = readFileSync(outputPath, 'utf-8');
    expect(content).toContain('export const generatedMockData =');
    expect(content).not.toContain('export const mockData');
  });

  it('uses custom exportName in JS output', () => {
    const generator = initGenerator();
    const data = { name: 'test' };
    const outputPath = `${testOutputDir}/custom-name.js`;

    generator.output(data, { path: outputPath, exportName: 'myMock' });

    const content = readFileSync(outputPath, 'utf-8');
    expect(content).toContain('export const myMock =');
  });

  it('ignores exportName for JSON output', () => {
    const generator = initGenerator();
    const data = { name: 'test' };
    const outputPath = `${testOutputDir}/custom-name.json`;

    generator.output(data, { path: outputPath, exportName: 'generatedMockData' });

    const content = readFileSync(outputPath, 'utf-8');
    expect(content).not.toContain('export const');
  });
});

describe('output - header/footer options', () => {
  it('prepends header to TS output', () => {
    const generator = initGenerator();
    const data = { name: 'test' };
    const outputPath = `${testOutputDir}/header.ts`;
    const header = "import type { MyType } from './types';";

    generator.output(data, { path: outputPath, header });

    const content = readFileSync(outputPath, 'utf-8');
    expect(content).toMatch(/^import type { MyType }/);
    expect(content).toContain('export const mockData =');
  });

  it('appends footer to TS output', () => {
    const generator = initGenerator();
    const data = { name: 'test' };
    const outputPath = `${testOutputDir}/footer.ts`;
    const footer = 'export type MockType = typeof mockData;';

    generator.output(data, { path: outputPath, footer });

    const content = readFileSync(outputPath, 'utf-8');
    expect(content).toContain('export const mockData =');
    expect(content).toMatch(/export type MockType = typeof mockData;$/);
  });

  it('supports both header and footer together', () => {
    const generator = initGenerator();
    const data = { id: 1 };
    const outputPath = `${testOutputDir}/header-footer.ts`;
    const header = "import type { User } from './types';";
    const footer = 'export type Data = typeof generatedData;';

    generator.output(data, {
      path: outputPath,
      exportName: 'generatedData',
      header,
      footer,
    });

    const content = readFileSync(outputPath, 'utf-8');
    expect(content).toMatch(/^import type { User }/);
    expect(content).toContain('export const generatedData =');
    expect(content).toMatch(/export type Data = typeof generatedData;$/);
  });

  it('ignores header and footer for JSON output', () => {
    const generator = initGenerator();
    const data = { name: 'test' };
    const outputPath = `${testOutputDir}/header.json`;

    generator.output(data, {
      path: outputPath,
      header: '// Generated mock data',
      footer: '// end',
    });

    const content = readFileSync(outputPath, 'utf-8');
    expect(content).not.toContain('// Generated mock data');
    expect(content).not.toContain('// end');
    const parsed = JSON.parse(content);
    expect(parsed).toEqual({ name: 'test' });
  });
});

describe('serialize', () => {
  it('returns serialized string without writing file', () => {
    const generator = initGenerator();
    const data = { name: 'test', count: 42 };

    const result = generator.serialize(data);

    expect(result).toContain('export const mockData =');
    expect(result).toContain('"name": "test"');
    expect(result).toContain('"count": 42');
    // No file should be created
    expect(existsSync(`${testOutputDir}`)).toBe(false);
  });

  it('respects exportName option', () => {
    const generator = initGenerator();
    const data = { id: 1 };

    const result = generator.serialize(data, { exportName: 'generatedMockData' });

    expect(result).toContain('export const generatedMockData =');
    expect(result).not.toContain('export const mockData');
  });

  it('respects header and footer options', () => {
    const generator = initGenerator();
    const data = { id: 1 };
    const header = "import type { MyType } from './types';";
    const footer = 'export type Data = typeof myData;';

    const result = generator.serialize(data, {
      exportName: 'myData',
      header,
      footer,
    });

    expect(result).toMatch(/^import type { MyType }/);
    expect(result).toContain('export const myData =');
    expect(result).toMatch(/export type Data = typeof myData;$/);
  });

  it('returns JSON string when ext is json', () => {
    const generator = initGenerator();
    const data = { name: 'test' };

    const result = generator.serialize(data, { ext: 'json' });

    expect(result).not.toContain('export const');
    const parsed = JSON.parse(result);
    expect(parsed).toEqual({ name: 'test' });
  });

  it('serializes Date correctly', () => {
    const generator = initGenerator();
    const data = { createdAt: new Date('2025-01-01T00:00:00.000Z') };

    const result = generator.serialize(data);

    expect(result).toContain('new Date("2025-01-01T00:00:00.000Z")');
  });

  it('produces same content as output writes to file', () => {
    const generator = initGenerator();
    const schema = z.object({ name: z.string(), count: z.number() });
    const data = generator.generate(schema);
    const outputPath = `${testOutputDir}/serialize-compare.ts`;
    const options = { exportName: 'testData' as const, header: '// header' };

    const serialized = generator.serialize(data, options);
    generator.output(data, { ...options, path: outputPath });
    const fileContent = readFileSync(outputPath, 'utf-8');

    expect(serialized).toBe(fileContent);
  });
});

describe('serializeBinary / deserialize (v8 structured clone)', () => {
  it('round-trips primitives, Date, BigInt, Map, Set, RegExp, undefined', () => {
    const generator = initGenerator();
    const data = {
      str: 'hello',
      num: 42,
      bool: true,
      und: undefined,
      bi: 123456789012345678901234567890n,
      d: new Date('2025-01-01T00:00:00.000Z'),
      m: new Map<string, unknown>([
        ['a', 1],
        ['b', new Date(0)],
      ]),
      s: new Set([1, 2, 3]),
      re: /abc/gi,
      bytes: new Uint8Array([1, 2, 3, 4]),
    };

    const buf = generator.serializeBinary(data);
    expect(Buffer.isBuffer(buf)).toBe(true);

    const restored = generator.deserialize(buf) as typeof data;
    expect(restored.str).toBe('hello');
    expect(restored.num).toBe(42);
    expect(restored.bool).toBe(true);
    expect(restored.und).toBeUndefined();
    expect(restored.bi).toBe(123456789012345678901234567890n);
    expect(restored.d).toBeInstanceOf(Date);
    expect(restored.d.toISOString()).toBe('2025-01-01T00:00:00.000Z');
    expect(restored.m).toBeInstanceOf(Map);
    expect(restored.m.get('a')).toBe(1);
    expect((restored.m.get('b') as Date).toISOString()).toBe(new Date(0).toISOString());
    expect(restored.s).toBeInstanceOf(Set);
    expect([...restored.s]).toEqual([1, 2, 3]);
    expect(restored.re).toBeInstanceOf(RegExp);
    expect(restored.re.source).toBe('abc');
    expect(restored.re.flags).toBe('gi');
    expect(restored.bytes).toBeInstanceOf(Uint8Array);
    expect(Array.from(restored.bytes)).toEqual([1, 2, 3, 4]);
  });

  it('round-trips circular references', () => {
    const generator = initGenerator();
    const a: Record<string, unknown> = { name: 'a' };
    const b: Record<string, unknown> = { name: 'b', a };
    a.b = b;

    const restored = generator.deserialize(generator.serializeBinary(a)) as typeof a;
    expect(restored.name).toBe('a');
    expect((restored.b as typeof b).name).toBe('b');
    expect((restored.b as typeof b).a).toBe(restored);
  });

  it('serializeBinary Buffer can be written manually and read back via deserialize(path)', () => {
    const generator = initGenerator();
    const data = { count: 7n, when: new Date('2026-04-23T00:00:00.000Z') };
    const outputPath = `${testOutputDir}/mock.bin`;

    mkdirSync(testOutputDir, { recursive: true });
    writeFileSync(outputPath, generator.serializeBinary(data));

    const restored = generator.deserialize(outputPath) as typeof data;
    expect(restored.count).toBe(7n);
    expect(restored.when.toISOString()).toBe('2026-04-23T00:00:00.000Z');
  });

  it('preserves data Zod can generate that JSON would lose', () => {
    const generator = initGenerator({ seed: 123 });
    const schema = z.object({
      id: z.bigint(),
      tags: z.set(z.string()),
      meta: z.map(z.string(), z.number()),
      createdAt: z.date(),
    });
    const data = generator.generate(schema);

    const restored = generator.deserialize(generator.serializeBinary(data)) as typeof data;
    expect(typeof restored.id).toBe('bigint');
    expect(restored.tags).toBeInstanceOf(Set);
    expect(restored.meta).toBeInstanceOf(Map);
    expect(restored.createdAt).toBeInstanceOf(Date);
    expect(schema.parse(restored)).toBeDefined();
  });
});

describe('output with binary flag (wrapper + .bin)', () => {
  it('writes user.ts wrapper and user.bin when ext=ts + binary=true + schema', () => {
    const generator = initGenerator();
    const schema = z.object({
      id: z.string(),
      createdAt: z.date(),
      count: z.bigint(),
      tags: z.set(z.string()),
    });
    const data = generator.generate(schema);
    const outputPath = `${testOutputDir}/user.ts`;

    const result = generator.output(data, {
      path: outputPath,
      binary: true,
      schema,
    });

    expect(result).toBe(outputPath);
    expect(existsSync(outputPath)).toBe(true);
    expect(existsSync(`${testOutputDir}/user.bin`)).toBe(true);

    const content = readFileSync(outputPath, 'utf-8');
    expect(content).toContain("import { readFileSync } from 'node:fs';");
    expect(content).toContain("import { deserialize } from 'node:v8';");
    expect(content).toContain("new URL(\"./user.bin\", import.meta.url)");
    expect(content).toContain('export const mockData = deserialize(');
    expect(content).toMatch(/\)\s+as\s+\{[\s\S]+id:\s+string;[\s\S]+createdAt:\s+Date;[\s\S]+count:\s+bigint;[\s\S]+tags:\s+Set<string>;/);
  });

  it('falls back to `as unknown` when schema is omitted for ts + binary', () => {
    const generator = initGenerator();
    const data = { n: 1n };
    const outputPath = `${testOutputDir}/noschema.ts`;

    generator.output(data, { path: outputPath, binary: true });

    const content = readFileSync(outputPath, 'utf-8');
    expect(content).toMatch(/\)\s+as\s+unknown;/);
  });

  it('writes user.js wrapper and user.bin when ext=js + binary=true, without type annotation', () => {
    const generator = initGenerator();
    const schema = z.object({ id: z.string(), count: z.bigint() });
    const data = generator.generate(schema);
    const outputPath = `${testOutputDir}/user.js`;

    generator.output(data, { path: outputPath, binary: true });

    expect(existsSync(outputPath)).toBe(true);
    expect(existsSync(`${testOutputDir}/user.bin`)).toBe(true);

    const content = readFileSync(outputPath, 'utf-8');
    expect(content).toContain("import { readFileSync } from 'node:fs';");
    expect(content).toContain("import { deserialize } from 'node:v8';");
    expect(content).toContain("new URL(\"./user.bin\", import.meta.url)");
    expect(content).toContain('export const mockData = deserialize(');
    expect(content).not.toMatch(/\sas\s+/);
  });

  it('round-trips via the generated wrapper at runtime', async () => {
    const generator = initGenerator();
    const schema = z.object({
      id: z.string(),
      createdAt: z.date(),
      count: z.bigint(),
      tags: z.set(z.string()),
    });
    const data = generator.generate(schema);
    const outputPath = `${testOutputDir}/runtime.js`;

    generator.output(data, { path: outputPath, binary: true });

    const moduleUrl = new URL(`file://${process.cwd()}/${outputPath}`).href;
    const mod = (await import(moduleUrl)) as { mockData: typeof data };

    expect(mod.mockData.id).toBe(data.id);
    expect(mod.mockData.createdAt).toBeInstanceOf(Date);
    expect(mod.mockData.createdAt.getTime()).toBe(data.createdAt.getTime());
    expect(typeof mod.mockData.count).toBe('bigint');
    expect(mod.mockData.count).toBe(data.count);
    expect(mod.mockData.tags).toBeInstanceOf(Set);
    expect([...mod.mockData.tags]).toEqual([...data.tags]);
  });

  it('respects exportName / header / footer in the wrapper', () => {
    const generator = initGenerator();
    const schema = z.object({ id: z.string() });
    const data = generator.generate(schema);
    const outputPath = `${testOutputDir}/custom.ts`;

    generator.output(data, {
      path: outputPath,
      binary: true,
      schema,
      exportName: 'userMock',
      header: '// top',
      footer: '// end',
    });

    const content = readFileSync(outputPath, 'utf-8');
    expect(content).toMatch(/^\/\/ top/);
    expect(content).toMatch(/\/\/ end\s*$/);
    expect(content).toContain('export const userMock = deserialize(');
  });

  it('uses default wrapper path ./__generated__/generated-mock-data.ts for ts + binary', () => {
    const generator = initGenerator();
    const schema = z.object({ id: z.string() });
    const data = generator.generate(schema);

    const result = generator.output(data, { binary: true, schema });

    expect(result).toBe('./__generated__/generated-mock-data.ts');
    expect(existsSync(result)).toBe(true);
    expect(existsSync('./__generated__/generated-mock-data.bin')).toBe(true);
  });

  it('ignores binary flag when ext is json (plain JSON output)', () => {
    const generator = initGenerator();
    const data = { id: 'abc' };
    const outputPath = `${testOutputDir}/plain.json`;

    const result = generator.output(data, { path: outputPath, binary: true });

    expect(result).toBe(outputPath);
    expect(existsSync(outputPath)).toBe(true);
    expect(existsSync(`${testOutputDir}/plain.bin`)).toBe(false);
    expect(JSON.parse(readFileSync(outputPath, 'utf-8'))).toEqual({ id: 'abc' });
  });

  it('serialize() throws when binary is true with ts/js', () => {
    const generator = initGenerator();
    expect(() =>
      generator.serialize({}, { ext: 'ts', binary: true }),
    ).toThrow(/output\(\)/);
    expect(() =>
      generator.serialize({}, { ext: 'js', binary: true }),
    ).toThrow(/output\(\)/);
  });

  it('serialize() ignores binary flag for json (no throw)', () => {
    const generator = initGenerator();
    const result = generator.serialize({ id: 1 }, { ext: 'json', binary: true });
    expect(JSON.parse(result)).toEqual({ id: 1 });
  });
});

describe('Output serialization - special types', () => {
  it('serializes Map correctly', () => {
    const generator = initGenerator({ seed: 123 });
    const schema = z.map(z.string(), z.number());
    const data = generator.generate(schema);

    const outputPath = generator.output(data, {
      path: `${testOutputDir}/map-test.ts`,
    });

    expect(existsSync(outputPath)).toBe(true);
    const content = readFileSync(outputPath, 'utf-8');
    expect(content).toContain('new Map([');
    expect(content).toMatch(/export const mockData = new Map\(\[/);
  });

  it('serializes Set correctly', () => {
    const generator = initGenerator({ seed: 123 });
    const schema = z.set(z.string());
    const data = generator.generate(schema);

    const outputPath = generator.output(data, {
      path: `${testOutputDir}/set-test.ts`,
    });

    expect(existsSync(outputPath)).toBe(true);
    const content = readFileSync(outputPath, 'utf-8');
    expect(content).toContain('new Set([');
    expect(content).toMatch(/export const mockData = new Set\(\[/);
  });

  it('serializes Symbol correctly', () => {
    const generator = initGenerator({ seed: 123 });
    const schema = z.symbol();
    const data = generator.generate(schema);

    const outputPath = generator.output(data, {
      path: `${testOutputDir}/symbol-test.ts`,
    });

    expect(existsSync(outputPath)).toBe(true);
    const content = readFileSync(outputPath, 'utf-8');
    expect(content).toMatch(/export const mockData = Symbol\(/);
  });

  it('serializes Date correctly', () => {
    const generator = initGenerator({ seed: 123 });
    const schema = z.date();
    const data = generator.generate(schema);

    const outputPath = generator.output(data, {
      path: `${testOutputDir}/date-test.ts`,
    });

    expect(existsSync(outputPath)).toBe(true);
    const content = readFileSync(outputPath, 'utf-8');
    expect(content).toMatch(/export const mockData = new Date\("/);
  });

  it('serializes BigInt correctly', () => {
    const generator = initGenerator({ seed: 123 });
    const schema = z.bigint();
    const data = generator.generate(schema);

    const outputPath = generator.output(data, {
      path: `${testOutputDir}/bigint-test.ts`,
    });

    expect(existsSync(outputPath)).toBe(true);
    const content = readFileSync(outputPath, 'utf-8');
    expect(content).toMatch(/export const mockData = \d+n;/);
  });

  it('serializes nested Map in object correctly', () => {
    const generator = initGenerator({ seed: 123 });
    const schema = z.object({
      id: z.string(),
      metadata: z.map(z.string(), z.number()),
    });
    const data = generator.generate(schema);

    const outputPath = generator.output(data, {
      path: `${testOutputDir}/nested-map-test.ts`,
    });

    expect(existsSync(outputPath)).toBe(true);
    const content = readFileSync(outputPath, 'utf-8');
    expect(content).toContain('"metadata": new Map([');
  });

  it('serializes nested Set in array correctly', () => {
    const generator = initGenerator({ seed: 123 });
    const schema = z.array(z.set(z.number()));
    const data = generator.generate(schema);

    const outputPath = generator.output(data, {
      path: `${testOutputDir}/nested-set-test.ts`,
    });

    expect(existsSync(outputPath)).toBe(true);
    const content = readFileSync(outputPath, 'utf-8');
    expect(content).toContain('new Set([');
  });

  it('serializes empty Map correctly', () => {
    const outputPath = initGenerator().output(new Map(), {
      path: `${testOutputDir}/empty-map-test.ts`,
    });

    const content = readFileSync(outputPath, 'utf-8');
    expect(content).toBe('export const mockData = new Map();\n');
  });

  it('serializes empty Set correctly', () => {
    const outputPath = initGenerator().output(new Set(), {
      path: `${testOutputDir}/empty-set-test.ts`,
    });

    const content = readFileSync(outputPath, 'utf-8');
    expect(content).toBe('export const mockData = new Set();\n');
  });

  it('serializes complex nested structure', () => {
    const generator = initGenerator({ seed: 123 });
    const schema = z.object({
      users: z.array(
        z.object({
          name: z.string(),
          roles: z.set(z.string()),
          metadata: z.map(z.string(), z.union([z.string(), z.number()])),
        }),
      ),
    });
    const data = generator.generate(schema);

    const outputPath = generator.output(data, {
      path: `${testOutputDir}/complex-test.ts`,
    });

    expect(existsSync(outputPath)).toBe(true);
    const content = readFileSync(outputPath, 'utf-8');
    expect(content).toContain('new Set([');
    expect(content).toContain('new Map([');
  });
});
