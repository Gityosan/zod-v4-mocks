import { existsSync, readFileSync, rmSync } from 'node:fs';
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
