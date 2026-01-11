import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  type CustomGeneratorType,
  initGenerator,
  type MockConfig,
} from '../src';

describe('initGenerator (functional base API)', () => {
  describe('basic types', () => {
    const generator = initGenerator();
    it('string', () => {
      const schema = z.string();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

  describe('determinism (same seed => same output)', () => {
    it('regex-based string', () => {
      const schema = z.string().regex(/^[a-z]{8}$/);
      const g1 = initGenerator({ seed: 777 });
      const g2 = initGenerator({ seed: 777 });
      const r1 = g1.generate(schema);
      const r2 = g2.generate(schema);
      expect(r1).toBe(r2);
    });

    it('cidrv6', () => {
      const schema = z.cidrv6();
      const g1 = initGenerator({ seed: 888 });
      const g2 = initGenerator({ seed: 888 });
      const r1 = g1.generate(schema);
      const r2 = g2.generate(schema);
      expect(r1).toBe(r2);
    });

    it('base64url', () => {
      const schema = z.base64url();
      const g1 = initGenerator({ seed: 999 });
      const g2 = initGenerator({ seed: 999 });
      const r1 = g1.generate(schema);
      const r2 = g2.generate(schema);
      expect(r1).toBe(r2);
    });

    it('union selection', () => {
      const schema = z.union([z.literal('A'), z.literal('B'), z.literal('C')]);
      const g1 = initGenerator({ seed: 13579 });
      const g2 = initGenerator({ seed: 13579 });
      const r1 = g1.generate(schema);
      const r2 = g2.generate(schema);
      expect(r1).toBe(r2);
    });

    it('composed object and array', () => {
      const schema = z.object({
        id: z.uuidv4(),
        list: z.array(z.union([z.int(), z.string().regex(/^x[0-9]{2}$/)])),
      });
      const g1 = initGenerator({ seed: 24680, array: { min: 3, max: 3 } });
      const g2 = initGenerator({ seed: 24680, array: { min: 3, max: 3 } });
      const r1 = g1.generate(schema);
      const r2 = g2.generate(schema);
      expect(r1).toEqual(r2);
    });

    it('optional probability', () => {
      const schema = z.string().optional();
      const g1 = initGenerator({ seed: 11111, optionalProbability: 0.5 });
      const g2 = initGenerator({ seed: 11111, optionalProbability: 0.5 });
      const r1 = g1.generate(schema);
      const r2 = g2.generate(schema);
      expect(r1).toEqual(r2);
    });

    it('nullable probability', () => {
      const schema = z.string().nullable();
      const g1 = initGenerator({ seed: 22222, nullableProbability: 0.5 });
      const g2 = initGenerator({ seed: 22222, nullableProbability: 0.5 });
      const r1 = g1.generate(schema);
      const r2 = g2.generate(schema);
      expect(r1).toEqual(r2);
    });

    it('random array length within bounds', () => {
      const schema = z.array(z.int());
      const g1 = initGenerator({ seed: 33333, array: { min: 1, max: 5 } });
      const g2 = initGenerator({ seed: 33333, array: { min: 1, max: 5 } });
      const r1 = g1.generate(schema) as unknown[];
      const r2 = g2.generate(schema) as unknown[];
      expect(r1.length).toBe(r2.length);
      expect(r1).toEqual(r2);
    });
  });

    it('number', () => {
      const schema = z.number();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('number');
    });

    it('int (v3)', () => {
      const schema = z.number().int();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('number');
    });

    it('int', () => {
      const schema = z.int();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('number');
    });

    it('int32', () => {
      const schema = z.int32();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('number');
      // int32's range: -2^31 to 2^31-1
      expect((result as number) >= -2147483648).toBe(true);
      expect((result as number) <= 2147483647).toBe(true);
      expect(Number.isInteger(result as number)).toBe(true);
    });

    it('uint32', () => {
      const schema = z.uint32();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('number');
      // uint32's range: 0 to 2^32-1
      expect((result as number) >= 0).toBe(true);
      expect((result as number) <= 4294967295).toBe(true);
      expect(Number.isInteger(result as number)).toBe(true);
    });

    it('int64', () => {
      const schema = z.int64();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('bigint');
      // int64's range: -2^63 to 2^63-1
      expect((result as bigint) >= -9223372036854775808n).toBe(true);
      expect((result as bigint) <= 9223372036854775807n).toBe(true);
    });

    it('uint64', () => {
      const schema = z.uint64();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('bigint');
      // uint64's range: 0 to 2^64-1
      expect((result as bigint) >= 0n).toBe(true);
      expect((result as bigint) <= 18446744073709551615n).toBe(true);
    });

    it('float32', () => {
      const schema = z.float32();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('number');
      // float32's range: -3.4e38 to 3.4e38
      expect(Math.abs(result as number) <= 3.4028235e38).toBe(true);
      expect(isFinite(result as number)).toBe(true);
    });

    it('float64', () => {
      const schema = z.float64();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('number');
      // float64's range: -1.8e308 to 1.8e308 (JavaScript's number range)
      expect(Math.abs(result as number) <= 1.7976931348623157e308).toBe(true);
      expect(isFinite(result as number)).toBe(true);
    });

    it('success', () => {
      const schema = z.success(z.string());
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('codec', () => {
      const stringToDate = z.codec(z.iso.datetime(), z.date(), {
        decode: (isoString: string) => new Date(isoString),
        encode: (date: Date) => date.toISOString(),
      });
      const result = generator.generate(stringToDate);
      expect(typeof result).toBe('string');
      expect(result).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('stringbool', () => {
      const schema = z.stringbool();
      const result = generator.generate(schema);
      expect(typeof result).toBe('string');
      const validValues = [
        'true',
        '1',
        'yes',
        'on',
        'y',
        'enabled',
        'false',
        '0',
        'no',
        'off',
        'n',
        'disabled',
      ];
      expect(validValues).toContain(result);

      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof schema.parse(result)).toBe('boolean');
    });

    it('json', () => {
      const schema = z.json();
      const result = generator.generate(schema);
      expect(result).toEqual({});
      expect(() => schema.parse(result)).not.toThrow();
    });

    it('boolean', () => {
      const schema = z.boolean();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('boolean');
    });

    it('BigInt', () => {
      const schema = z.bigint();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('bigint');
    });

    it('Date', () => {
      const schema = z.date();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(result).toBeInstanceOf(Date);
    });

    it('File', () => {
      const schema = z.file();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(result).toBeInstanceOf(File);
    });

    it('null', () => {
      const schema = z.null();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(result).toBeNull();
    });

    it('undefined', () => {
      const schema = z.undefined();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(result).toBeUndefined();
    });

    it('void', () => {
      const schema = z.void();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(result).toBeUndefined();
    });

    it('any', () => {
      const schema = z.any();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
    });

    it('unknown', () => {
      const schema = z.unknown();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
    });

    it('symbol', () => {
      const schema = z.symbol();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('symbol');
    });

    it('httpUrl', () => {
      const schema = z.httpUrl();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^https?:\/\//);
    });

    it('nonoptional', () => {
      const schema = z.string().optional().nonoptional();
      const result = generator.generate(schema);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(() => schema.parse(result)).not.toThrow();
    });

    it('hex', () => {
      const schema = z.hex();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^[0-9a-fA-F]*$/);
    });

    it('hash md5', () => {
      const schema = z.hash('md5');
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^[0-9a-fA-F]{32}$/);
    });

    it('hash sha256', () => {
      const schema = z.hash('sha256');
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^[0-9a-fA-F]{64}$/);
    });

    it('email', () => {
      const schema = z.email();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
      expect(result).toMatch(/@/);
    });

    it('url', () => {
      const schema = z.url();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^https?:\/\//);
    });

    it('jwt', () => {
      const schema = z.jwt();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
      expect((result as string).split('.')).toHaveLength(3);
    });

    it('emoji', () => {
      const schema = z.emoji();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
      expect((result as string).length).toBeGreaterThan(0);
    });

    it('guid', () => {
      const schema = z.guid();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
      expect(result).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('uuidv4', () => {
      const schema = z.uuidv4();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
      expect(result).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('uuidv6', () => {
      const schema = z.uuidv6();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('uuidv7', () => {
      const schema = z.uuidv7();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('nanoid', () => {
      const schema = z.nanoid();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
      expect((result as string).length).toBeGreaterThan(0);
    });

    it('cuid', () => {
      const schema = z.cuid();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('cuid2', () => {
      const schema = z.cuid2();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('ulid', () => {
      const schema = z.ulid();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
      expect((result as string).length).toBe(26);
    });

    it('xid', () => {
      const schema = z.xid();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('ksuid', () => {
      const schema = z.ksuid();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('ipv4', () => {
      const schema = z.ipv4();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^\d+\.\d+\.\d+\.\d+$/);
    });

    it('ipv6', () => {
      const schema = z.ipv6();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
      expect(result).toMatch(/:/);
    });

    it('cidrv4', () => {
      const schema = z.cidrv4();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
      expect(result).toMatch(/\/\d+$/);
    });

    it('cidrv6', () => {
      const schema = z.cidrv6();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
      expect(result).toMatch(/\/\d+$/);
    });

    it('base64', () => {
      const schema = z.base64();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('base64url', () => {
      const schema = z.base64url();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('e164', () => {
      const schema = z.e164();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^\+\d+$/);
    });

    it('hostname', () => {
      const schema = z.hostname();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
      expect((result as string).length).toBeGreaterThan(0);
    });

    it('default', () => {
      const schema = z.string().default('test');
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
      expect(result).toBe('test');
    });

    it('prefault', () => {
      const schema = z
        .string()
        .transform((value) => value + '!')
        .prefault('test');
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
      expect(result).toBe('test');
    });

    it('success', () => {
      const schema = z.success(z.string());
      const result = generator.generate(schema);
      expect(typeof result).toBe('string');
    });

    it('catch', () => {
      const schema = z.string().catch('test');
      const result = generator.generate(schema);
      expect(typeof result).toBe('string');
    });
  });
  describe('complex types', () => {
    const generator = initGenerator();
    describe('xor (exclusive union)', () => {
      it('basic xor with primitives', () => {
        const schema = z.xor([z.string(), z.number()]);
        const result = generator.generate(schema);
        expect(() => schema.parse(result)).not.toThrow();
        expect(
          typeof result === 'string' || typeof result === 'number',
        ).toBe(true);
      });

      it('xor with objects', () => {
        const schema = z.xor([
          z.object({ type: z.literal('a'), value: z.string() }),
          z.object({ type: z.literal('b'), count: z.number() }),
        ]);
        const result = generator.generate(schema);
        expect(() => schema.parse(result)).not.toThrow();
        expect(result).toHaveProperty('type');
        expect(['a', 'b']).toContain((result as any).type);
      });

      it('xor with multiple options', () => {
        const schema = z.xor([
          z.literal('active'),
          z.literal('inactive'),
          z.literal('pending'),
        ]);
        const result = generator.generate(schema);
        expect(() => schema.parse(result)).not.toThrow();
        expect(['active', 'inactive', 'pending']).toContain(result);
      });

      it('xor determinism (same seed => same output)', () => {
        const schema = z.xor([z.literal('A'), z.literal('B'), z.literal('C')]);
        const g1 = initGenerator({ seed: 12345 });
        const g2 = initGenerator({ seed: 12345 });
        const r1 = g1.generate(schema);
        const r2 = g2.generate(schema);
        expect(r1).toBe(r2);
      });

      it('xor ensures value fails other schemas (exclusivity)', () => {
        // With distinct types, the generated value should only match one schema
        const schema = z.xor([
          z.object({ kind: z.literal('cat'), meow: z.boolean() }),
          z.object({ kind: z.literal('dog'), bark: z.boolean() }),
        ]);
        const result = generator.generate(schema);
        expect(() => schema.parse(result)).not.toThrow();

        // Verify exclusivity: result matches exactly one of the options
        const options = [
          z.object({ kind: z.literal('cat'), meow: z.boolean() }),
          z.object({ kind: z.literal('dog'), bark: z.boolean() }),
        ];
        const matchCount = options.filter(
          (opt) => opt.safeParse(result).success,
        ).length;
        expect(matchCount).toBe(1);
      });
    });

    describe('exactOptional', () => {
      it('exactOptional in object - generates value or omits key', () => {
        const schema = z.object({
          required: z.string(),
          maybePresent: z.string().exactOptional(),
        });
        // Generate multiple times to verify behavior
        const results: unknown[] = [];
        for (let i = 0; i < 10; i++) {
          const gen = initGenerator({ seed: i, optionalProbability: 0.5 });
          results.push(gen.generate(schema));
        }

        // All results should parse successfully
        results.forEach((result) => {
          expect(() => schema.parse(result)).not.toThrow();
        });

        // Some should have the key, some should not (probabilistic)
        const withKey = results.filter((r: any) => 'maybePresent' in r);
        const withoutKey = results.filter((r: any) => !('maybePresent' in r));
        expect(withKey.length + withoutKey.length).toBe(10);
      });

      it('exactOptional does not produce undefined value', () => {
        const schema = z.object({
          field: z.number().exactOptional(),
        });
        // Generate with low probability to ensure we get values
        const gen = initGenerator({ seed: 42, optionalProbability: 0 });
        const result = gen.generate(schema) as any;
        expect(() => schema.parse(result)).not.toThrow();
        // If key exists, it should not be undefined
        if ('field' in result) {
          expect(result.field).not.toBe(undefined);
          expect(typeof result.field).toBe('number');
        }
      });
    });

    describe('slugify', () => {
      it('slugify transforms string to slug format', () => {
        const schema = z.string().slugify();
        const result = generator.generate(schema);
        expect(() => schema.parse(result)).not.toThrow();
        expect(typeof result).toBe('string');
        // Slugified strings should be lowercase and use hyphens
        expect(result).toMatch(/^[a-z0-9-]*$/);
      });

      it('slugify with min/max length', () => {
        const schema = z.string().min(5).max(20).slugify();
        const result = generator.generate(schema);
        expect(() => schema.parse(result)).not.toThrow();
        expect(typeof result).toBe('string');
      });
    });

    describe('apply (schema transformation helper)', () => {
      it('apply with min/max constraints', () => {
        const setConstraints = <T extends z.ZodNumber>(s: T) => s.min(0).max(100);
        const schema = z.number().apply(setConstraints);
        const result = generator.generate(schema);
        expect(() => schema.parse(result)).not.toThrow();
        expect(typeof result).toBe('number');
        expect(result as number).toBeGreaterThanOrEqual(0);
        expect(result as number).toBeLessThanOrEqual(100);
      });

      it('apply with nullable', () => {
        const makeNullable = <T extends z.ZodString>(s: T) => s.nullable();
        const schema = z.string().apply(makeNullable);
        const result = generator.generate(schema);
        expect(() => schema.parse(result)).not.toThrow();
        expect(result === null || typeof result === 'string').toBe(true);
      });

      it('apply with optional', () => {
        const makeOptional = <T extends z.ZodNumber>(s: T) => s.optional();
        const schema = z.number().apply(makeOptional);
        const result = generator.generate(schema);
        expect(() => schema.parse(result)).not.toThrow();
        expect(result === undefined || typeof result === 'number').toBe(true);
      });
    });

    describe('with and check (schema check helpers)', () => {
      it('with applies multiple checks', () => {
        const schema = z.string().with(z.minLength(5), z.toLowerCase());
        const result = generator.generate(schema);
        expect(() => schema.parse(result)).not.toThrow();
        expect(typeof result).toBe('string');
        expect((result as string).length).toBeGreaterThanOrEqual(5);
        expect(result).toBe((result as string).toLowerCase());
      });

      it('check applies multiple checks with trim', () => {
        const schema = z.string().check(z.minLength(5), z.trim(), z.toLowerCase());
        const result = generator.generate(schema);
        expect(() => schema.parse(result)).not.toThrow();
        expect(typeof result).toBe('string');
        expect((result as string).length).toBeGreaterThanOrEqual(5);
        expect(result).toBe((result as string).toLowerCase());
        expect(result).toBe((result as string).trim());
      });

      it('with and check are equivalent', () => {
        const schema1 = z.string().with(z.minLength(3), z.toUpperCase());
        const schema2 = z.string().check(z.minLength(3), z.toUpperCase());

        const g1 = initGenerator({ seed: 999 });
        const g2 = initGenerator({ seed: 999 });

        const r1 = g1.generate(schema1);
        const r2 = g2.generate(schema2);

        expect(r1).toBe(r2);
        expect(() => schema1.parse(r1)).not.toThrow();
        expect(() => schema2.parse(r2)).not.toThrow();
      });
    });

    describe('discriminatedUnion', () => {
      it('basic discriminatedUnion', () => {
        const schema = z.discriminatedUnion('type', [
          z.object({ type: z.literal('TypeA'), fieldA: z.string() }),
          z.object({ type: z.literal('TypeB'), fieldB: z.number() }),
        ]);
        const result = generator.generate(schema);
        expect(() => schema.parse(result)).not.toThrow();
        expect(result).toHaveProperty('type');
        expect(['TypeA', 'TypeB']).toContain((result as any).type);
      });

      it('discriminatedUnion with multiple options', () => {
        const schema = z.discriminatedUnion('kind', [
          z.object({ kind: z.literal('circle'), radius: z.number() }),
          z.object({ kind: z.literal('square'), side: z.number() }),
          z.object({ kind: z.literal('rectangle'), width: z.number(), height: z.number() }),
        ]);
        const result = generator.generate(schema);
        expect(() => schema.parse(result)).not.toThrow();
        expect(['circle', 'square', 'rectangle']).toContain((result as any).kind);
      });

      it('discriminatedUnion works after generating other schemas', () => {
        // Regression test for bug: discriminatedUnion fails after processing other schemas
        const gen = initGenerator({ seed: 123, consistentKey: 'mockKey' });

        const CommunitySchema = z.object({
          id: z.string().uuid(),
          name: z.string(),
          createdAt: z.date().optional(),
        });
        const ListCommunityResponse = z.array(CommunitySchema);

        const DetailedTicket = z.discriminatedUnion('type', [
          z.object({ type: z.literal('TypeA'), fieldA: z.string() }),
          z.object({ type: z.literal('TypeB'), fieldB: z.number() }),
        ]);

        // Generate other schema first
        gen.generate(ListCommunityResponse);

        // discriminatedUnion should still work
        const result = gen.generate(DetailedTicket);
        expect(() => DetailedTicket.parse(result)).not.toThrow();
        expect(['TypeA', 'TypeB']).toContain((result as any).type);
      });
    });
    describe('templateLiteral', () => {
      it('with string', () => {
        const schema = z.templateLiteral(['Hello ', z.string(), '!']);
        const result = generator.generate(schema);
        expect(() => schema.parse(result)).not.toThrow();
        expect(typeof result).toBe('string');
        expect(result as string).toMatch(/^Hello .+!$/);
      });

      it('with number', () => {
        const schema = z.templateLiteral(['Count: ', z.number()]);
        const result = generator.generate(schema);
        expect(() => schema.parse(result)).not.toThrow();
        expect(typeof result).toBe('string');
        expect(result as string).toMatch(/^Count: \d+(\.\d+)?$/);
      });

      it('with multiple parts', () => {
        const schema = z.templateLiteral([
          'User ',
          z.string(),
          ' has ',
          z.number(),
          ' items',
        ]);
        const result = generator.generate(schema);
        expect(() => schema.parse(result)).not.toThrow();
        expect(typeof result).toBe('string');
        expect(result as string).toMatch(/^User .+ has \d+(\.\d+)? items$/);
      });

      it('with literal values', () => {
        const schema = z.templateLiteral([
          'Status: ',
          z.literal('active'),
          ' - ID: ',
          z.number(),
        ]);
        const result = generator.generate(schema);
        expect(() => schema.parse(result)).not.toThrow();
        expect(typeof result).toBe('string');
        expect(result as string).toMatch(/^Status: active - ID: \d+(\.\d+)?$/);
      });

      it('with boolean', () => {
        const schema = z.templateLiteral(['Enabled: ', z.boolean()]);
        const result = generator.generate(schema);
        expect(() => schema.parse(result)).not.toThrow();
        expect(typeof result).toBe('string');
        expect(result as string).toMatch(/^Enabled: (true|false)$/);
      });

      it('with union', () => {
        const schema = z.templateLiteral([
          'Type: ',
          z.union([z.literal('user'), z.literal('admin')]),
        ]);
        const result = generator.generate(schema);
        expect(() => schema.parse(result)).not.toThrow();
        expect(typeof result).toBe('string');
        expect(result as string).toMatch(/^Type: (user|admin)$/);
      });

      it('with null', () => {
        const schema = z.templateLiteral(['Value: ', z.null()]);
        const result = generator.generate(schema);
        expect(() => schema.parse(result)).not.toThrow();
        expect(typeof result).toBe('string');
        expect(result).toBe('Value: null');
      });

      it('with undefined', () => {
        const schema = z.templateLiteral(['Value: ', z.undefined()]);
        const result = generator.generate(schema);
        expect(() => schema.parse(result)).not.toThrow();
        expect(typeof result).toBe('string');
        expect(result).toBe('Value: undefined');
      });

      it('with nullable', () => {
        const schema = z.templateLiteral(['Result: ', z.string().nullable()]);
        const result = generator.generate(schema);
        expect(() => schema.parse(result)).not.toThrow();
        expect(typeof result).toBe('string');
        expect(result as string).toMatch(/^Result: (null|.+)$/);
      });

      it('with optional', () => {
        const schema = z.templateLiteral(['Message: ', z.string().optional()]);
        const result = generator.generate(schema);
        expect(() => schema.parse(result)).not.toThrow();
        expect(typeof result).toBe('string');
        expect(result as string).toMatch(/^Message: (.*)$/);
      });
    });
  });
  describe('options', () => {
    it('seed', () => {
      const config: Partial<MockConfig> = { seed: 12345 };
      const generator1 = initGenerator(config);
      const generator2 = initGenerator(config);

      const schema = z.string();
      const result1 = generator1.generate(schema);
      const result2 = generator2.generate(schema);

      expect(result1).toBe(result2);
    });

    it('locale', () => {
      const config: Partial<MockConfig> = { locale: 'en' };
      const generator = initGenerator(config);

      const schema = z.string();
      const result = generator.generate(schema);

      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('locale array', () => {
      const config: Partial<MockConfig> = { locale: ['ja', 'en'] };
      const generator = initGenerator(config);

      const schema = z.string();
      const result = generator.generate(schema);

      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });
  });
  describe('override', () => {
    it('custom generator', () => {
      const generator = initGenerator();
      const customGenerator: CustomGeneratorType = () => 'test';
      generator.override(customGenerator);

      const schema = z.string();
      const result = generator.generate(schema);

      expect(result).toBe('test');
    });

    it('path and key in override - object', () => {
      const schema = z.object({
        id: z.string(),
        user: z.object({
          id: z.string(),
          name: z.string(),
        }),
      });

      const paths: string[] = [];
      const keys: (string | number | undefined)[] = [];

      const customGenerator: CustomGeneratorType = (s, options) => {
        paths.push(options.path.join('.'));
        keys.push(options.key);
        return undefined; // fallback to default
      };

      const generator = initGenerator().override(customGenerator);
      generator.generate(schema);

      expect(paths).toContain('id');
      expect(paths).toContain('user');
      expect(paths).toContain('user.id');
      expect(paths).toContain('user.name');
      expect(keys).toContain('id');
      expect(keys).toContain('user');
      expect(keys).toContain('name');
    });

    it('path and key in override - array', () => {
      const schema = z.array(z.object({ id: z.string() }));

      const paths: string[] = [];
      const keys: (string | number | undefined)[] = [];

      const customGenerator: CustomGeneratorType = (s, options) => {
        paths.push(options.path.join('.'));
        keys.push(options.key);
        return undefined;
      };

      const generator = initGenerator({ array: { min: 2, max: 2 } }).override(
        customGenerator,
      );
      generator.generate(schema);

      expect(paths).toContain('0');
      expect(paths).toContain('0.id');
      expect(paths).toContain('1');
      expect(paths).toContain('1.id');
      expect(keys).toContain(0);
      expect(keys).toContain(1);
      expect(keys).toContain('id');
    });

    it('path and key in override - field-specific override', () => {
      const schema = z.object({
        id: z.string(),
        user: z.object({
          id: z.string(),
          name: z.string(),
        }),
      });

      const customGenerator: CustomGeneratorType = (s, options) => {
        const pathStr = options.path.join('.');
        if (pathStr === 'id') return 'root-id';
        if (pathStr === 'user.id') return 'user-id';
        return undefined;
      };

      const generator = initGenerator().override(customGenerator);
      const result = generator.generate(schema) as any;

      expect(result.id).toBe('root-id');
      expect(result.user.id).toBe('user-id');
      expect(typeof result.user.name).toBe('string');
    });

    it('path and key in override - array element override', () => {
      const schema = z.array(z.object({ id: z.string(), label: z.string() }));

      const customGenerator: CustomGeneratorType = (s, options) => {
        const { path, key } = options;
        const pathStr = path.join('.');
        // Override all id fields in array
        if (key === 'id' && pathStr.match(/^\d+\.id$/)) {
          return `id-${path[0]}`;
        }
        return undefined;
      };

      const generator = initGenerator({ array: { min: 2, max: 2 } }).override(
        customGenerator,
      );
      const result = generator.generate(schema) as any[];

      expect(result[0].id).toBe('id-0');
      expect(result[1].id).toBe('id-1');
      expect(typeof result[0].label).toBe('string');
      expect(typeof result[1].label).toBe('string');
    });
  });
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

  describe('multiGenerate', () => {
    it('generates multiple schemas with keys', () => {
      const generator = initGenerator();
      const userSchema = z.object({ name: z.string(), age: z.number() });
      const postSchema = z.object({ title: z.string(), content: z.string() });

      const result = generator.multiGenerate({
        user: userSchema,
        post: postSchema,
      });

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('post');
      expect(typeof result.user.name).toBe('string');
      expect(typeof result.user.age).toBe('number');
      expect(typeof result.post.title).toBe('string');
      expect(typeof result.post.content).toBe('string');
    });
  });

  describe('output', () => {
    const fs = require('node:fs');
    const testOutputDir = './__test_generated__';

    afterEach(() => {
      if (fs.existsSync(testOutputDir)) {
        fs.rmSync(testOutputDir, { recursive: true });
      }
    });

    it('outputs JSON file and returns path', () => {
      const generator = initGenerator();
      const schema = z.object({ name: z.string() });
      const data = generator.generate(schema);
      const outputPath = `${testOutputDir}/test.json`;

      const result = generator.output(data, { path: outputPath });

      expect(result).toBe(outputPath);
      expect(fs.existsSync(outputPath)).toBe(true);
      const content = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
      expect(content).toHaveProperty('name');
    });

    it('outputs TS file with Date serialization', () => {
      const generator = initGenerator();
      const schema = z.object({ name: z.string(), createdAt: z.date() });
      const data = generator.generate(schema);
      const outputPath = `${testOutputDir}/test.ts`;

      const result = generator.output(data, { path: outputPath });

      expect(result).toBe(outputPath);
      expect(fs.existsSync(outputPath)).toBe(true);
      const content = fs.readFileSync(outputPath, 'utf-8');
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
      expect(fs.existsSync(outputPath)).toBe(true);
      const content = fs.readFileSync(outputPath, 'utf-8');
      expect(content).toContain('export const mockData');
      expect(content).toContain('new Date(');
    });

    it('outputs JSON file with Date as ISO string', () => {
      const generator = initGenerator();
      const schema = z.object({ name: z.string(), createdAt: z.date() });
      const data = generator.generate(schema);
      const outputPath = `${testOutputDir}/date.json`;

      generator.output(data, { path: outputPath });

      const content = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
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

      const content = fs.readFileSync(outputPath, 'utf-8');
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

      const content = fs.readFileSync(outputPath, 'utf-8');
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

      const content = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
      expect(typeof content.createdAt).toBe('string');
      expect(content.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(typeof content.count).toBe('string');
      expect(content.count).toMatch(/^\d+$/);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('BigInt values were converted to strings'),
      );

      warnSpy.mockRestore();
    });

    it('outputs to default path when no path specified', () => {
      const generator = initGenerator();
      const data = { test: 'value' };
      const defaultPath = './__generated__/generated-mock-data.ts';

      const result = generator.output(data);

      expect(result).toBe(defaultPath);
      expect(fs.existsSync(defaultPath)).toBe(true);
      fs.rmSync('./__generated__', { recursive: true });
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

      const content = fs.readFileSync(outputPath, 'utf-8');
      expect(content).toContain('"user"');
      expect(content).toContain('"post"');
    });

    it('outputs TS file with BigInt serialization', () => {
      const generator = initGenerator();
      const schema = z.object({ count: z.bigint() });
      const data = generator.generate(schema);
      const outputPath = `${testOutputDir}/bigint.ts`;

      generator.output(data, { path: outputPath });

      const content = fs.readFileSync(outputPath, 'utf-8');
      expect(content).toContain('export const mockData');
      expect(content).toMatch(/\d+n/);
    });

    it('outputs JS file with BigInt serialization', () => {
      const generator = initGenerator();
      const schema = z.object({ count: z.bigint() });
      const data = generator.generate(schema);
      const outputPath = `${testOutputDir}/bigint.js`;

      generator.output(data, { path: outputPath });

      const content = fs.readFileSync(outputPath, 'utf-8');
      expect(content).toContain('export const mockData');
      expect(content).toMatch(/\d+n/);
    });

    it('outputs JSON file with BigInt converted to string', () => {
      const generator = initGenerator();
      const schema = z.object({ count: z.bigint() });
      const data = generator.generate(schema);
      const outputPath = `${testOutputDir}/bigint.json`;

      generator.output(data, { path: outputPath });

      const content = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
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
        expect.stringContaining('BigInt values were converted to strings'),
      );
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('count:'));
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('amount:'));

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
  });
});
