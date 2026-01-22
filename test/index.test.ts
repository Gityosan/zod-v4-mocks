import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { initGenerator } from '../src';

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
      const gen = initGenerator({ seed: 1, defaultProbability: 1 });
      const schema = z.string().default('test');
      const result = gen.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
      expect(result).toBe('test');
    });

    it('prefault', () => {
      const gen = initGenerator({ seed: 1, defaultProbability: 1 });
      const schema = z
        .string()
        .transform((value) => value + '!')
        .prefault('test');
      const result = gen.generate(schema);
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

  describe('ZodMAC', () => {
    const generator = initGenerator({ seed: 12345 });

    it('generates valid MAC address', () => {
      const schema = z.mac();
      const result = generator.generate(schema);
      expect(typeof result).toBe('string');
      // MAC address format: XX:XX:XX:XX:XX:XX or XX-XX-XX-XX-XX-XX
      expect(result).toMatch(/^([0-9a-f]{2}[:-]){5}[0-9a-f]{2}$/i);
      const parseResult = schema.safeParse(result);
      expect(parseResult.success).toBe(true);
    });

    it('generates consistent MAC address with same seed', () => {
      const schema = z.mac();
      const gen1 = initGenerator({ seed: 999 });
      const gen2 = initGenerator({ seed: 999 });
      const result1 = gen1.generate(schema);
      const result2 = gen2.generate(schema);
      expect(result1).toBe(result2);
    });

    it('generates different MAC addresses with different seeds', () => {
      const schema = z.mac();
      const gen1 = initGenerator({ seed: 111 });
      const gen2 = initGenerator({ seed: 222 });
      const result1 = gen1.generate(schema);
      const result2 = gen2.generate(schema);
      expect(result1).not.toBe(result2);
    });

    it('works in objects', () => {
      const schema = z.object({
        deviceId: z.string(),
        macAddress: z.mac(),
      });
      const result = generator.generate(schema);
      expect(typeof result.deviceId).toBe('string');
      expect(typeof result.macAddress).toBe('string');
      expect(result.macAddress).toMatch(/^([0-9a-f]{2}[:-]){5}[0-9a-f]{2}$/i);
      const parseResult = schema.safeParse(result);
      expect(parseResult.success).toBe(true);
    });

    it('works in arrays', () => {
      const schema = z.array(z.mac()).min(3).max(5);
      const result = generator.generate(schema);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(3);
      expect(result.length).toBeLessThanOrEqual(5);
      result.forEach((mac) => {
        expect(typeof mac).toBe('string');
        expect(mac).toMatch(/^([0-9a-f]{2}[:-]){5}[0-9a-f]{2}$/i);
      });
      const parseResult = schema.safeParse(result);
      expect(parseResult.success).toBe(true);
    });
  });
});
