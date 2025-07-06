import { describe, expect, it } from 'vitest';
import { z } from 'zod/v4';
import {
  type CustomGeneratorType,
  initGenerator,
  type MockConfig,
  ZodMockGenerator,
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
    });

    it('int64', () => {
      const schema = z.int64();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('bigint');
    });

    it('uint64', () => {
      const schema = z.uint64();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('bigint');
    });

    it('float32', () => {
      const schema = z.float32();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('number');
    });

    it('float64', () => {
      const schema = z.float64();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('number');
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
  });
  describe('options', () => {
    it('seed', () => {
      const config: MockConfig = { seed: 12345 };
      const generator1 = initGenerator(config);
      const generator2 = initGenerator(config);

      const schema = z.string();
      const result1 = generator1.generate(schema);
      const result2 = generator2.generate(schema);

      expect(result1).toBe(result2);
    });

    it('locale', () => {
      const config: MockConfig = { locale: 'en' };
      const generator = initGenerator(config);

      const schema = z.string();
      const result = generator.generate(schema);

      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('locale array', () => {
      const config: MockConfig = { locale: ['ja', 'en'] };
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
});

describe('ZodMockGenerator (backward compatibility)', () => {
  const generator = new ZodMockGenerator({ seed: 1 });

  describe('basic types', () => {
    it('string', () => {
      const schema = z.string();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
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
    });

    it('int64', () => {
      const schema = z.int64();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('bigint');
    });

    it('uint64', () => {
      const schema = z.uint64();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('bigint');
    });

    it('float32', () => {
      const schema = z.float32();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('number');
    });

    it('float64', () => {
      const schema = z.float64();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('number');
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
  });

  describe('Special string format(v3)', () => {
    it('email', () => {
      const schema = z.string().email();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('URL', () => {
      const schema = z.string().url();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('JWT', () => {
      const schema = z.string().jwt();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('emoji', () => {
      const schema = z.string().emoji();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('guid', () => {
      const schema = z.string().guid();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('uuid', () => {
      const schema = z.string().uuid();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('uuidv4', () => {
      const schema = z.string().uuidv4();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('uuidv6', () => {
      const schema = z.string().uuidv6();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('uuidv7', () => {
      const schema = z.string().uuidv7();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('nanoid', () => {
      const schema = z.string().nanoid();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('cuid', () => {
      const schema = z.string().cuid();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('cuid2', () => {
      const schema = z.string().cuid2();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('ulid', () => {
      const schema = z.string().ulid();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('xid', () => {
      const schema = z.string().xid();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('ksuid', () => {
      const schema = z.string().ksuid();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('cidrv4', () => {
      const schema = z.string().cidrv4();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('cidrv6', () => {
      const schema = z.string().cidrv6();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('e164', () => {
      const schema = z.string().e164();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('IPv4', () => {
      const schema = z.string().ipv4();
      const result = generator.generate(schema);
      expect(typeof result).toBe('string');
    });

    it('IPv6', () => {
      const schema = z.string().ipv6();
      const result = generator.generate(schema);
      expect(typeof result).toBe('string');
    });

    it('datetime', () => {
      const schema = z.string().datetime();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('date', () => {
      const schema = z.string().date();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('time', () => {
      const schema = z.string().time();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('duration', () => {
      const schema = z.string().duration();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('base64', () => {
      const schema = z.string().base64();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('base64url', () => {
      const schema = z.string().base64url();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });
  });

  describe('Special string format(v4)', () => {
    it('email', () => {
      const schema = z.email();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('URL', () => {
      const schema = z.url();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('JWT', () => {
      const schema = z.jwt();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('emoji', () => {
      const schema = z.emoji();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('guid', () => {
      const schema = z.guid();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('uuid', () => {
      const schema = z.uuid();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('uuidv4', () => {
      const schema = z.uuidv4();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
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

    it('cidrv4', () => {
      const schema = z.cidrv4();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('cidrv6', () => {
      const schema = z.cidrv6();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('e164', () => {
      const schema = z.e164();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('IPv4', () => {
      const schema = z.ipv4();
      const result = generator.generate(schema);
      expect(typeof result).toBe('string');
    });

    it('IPv6', () => {
      const schema = z.ipv6();
      const result = generator.generate(schema);
      expect(typeof result).toBe('string');
    });

    it('iso datetime', () => {
      const schema = z.iso.datetime();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('iso date', () => {
      const schema = z.iso.date();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('iso time', () => {
      const schema = z.iso.time();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('iso duration', () => {
      const schema = z.iso.duration();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
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
  });

  describe('Composite type', () => {
    it('array', () => {
      const schema = z.array(z.string());
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(Array.isArray(result)).toBe(true);
    });

    it('object', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
        isActive: z.boolean(),
      });
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('object');
      expect(result).not.toBeNull();
    });

    it('nested object', () => {
      const schema = z.object({
        user: z.object({
          profile: z.object({
            name: z.string(),
            email: z.email(),
          }),
          settings: z.array(z.string()),
        }),
        metadata: z.object({
          createdAt: z.date(),
          tags: z.array(z.string()),
        }),
      });
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
    });

    it('optional', () => {
      const schema = z.object({
        required: z.string(),
        optional: z.string().optional(),
      });
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
    });

    it('nullable', () => {
      const schema = z.object({
        required: z.string(),
        nullable: z.string().nullable(),
      });
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
    });

    it('union', () => {
      const schema = z.union([z.string(), z.number(), z.boolean()]);
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
    });

    it('union(or)', () => {
      const schema = z.string().or(z.number()).or(z.boolean());
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
    });

    it('enum', () => {
      const schema = z.enum(['red', 'green', 'blue']);
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(['red', 'green', 'blue']).toContain(result);
    });

    it('literal', () => {
      const schema = z.literal('hello');
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(result).toBe('hello');
    });

    it('literals', () => {
      const schema = z.literal(['hello', 'world']);
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(['hello', 'world']).toContain(result);
    });

    it('default', () => {
      const schema = z.string().default('default value');
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });
  });

  describe('intersection', () => {
    describe('object intersection', () => {
      it('basic object intersection', () => {
        const schema1 = z.object({ a: z.string(), b: z.number() });
        const schema2 = z.object({ b: z.number(), c: z.boolean() });
        const intersection = schema1.and(schema2);
        const result = generator.generate(intersection);

        expect(() => intersection.parse(result)).not.toThrow();
        expect(typeof result).toBe('object');
        expect(result).toHaveProperty('a');
        expect(result).toHaveProperty('b');
        expect(result).toHaveProperty('c');
        expect(typeof (result as any).a).toBe('string');
        expect(typeof (result as any).b).toBe('number');
        expect(typeof (result as any).c).toBe('boolean');
      });

      it('complex object intersection', () => {
        const schema1 = z.object({
          user: z.object({ name: z.string() }),
          data: z.array(z.string()),
        });
        const schema2 = z.object({
          user: z.object({ email: z.email() }),
          meta: z.boolean(),
        });
        const intersection = schema1.and(schema2);
        const result = generator.generate(intersection);

        expect(() => intersection.parse(result)).not.toThrow();
        expect(result).toHaveProperty('user');
        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('meta');
      });
    });

    describe('primitive type constraint merge', () => {
      it('number constraint merge', () => {
        const schema1 = z.number().min(10).max(50);
        const schema2 = z.number().min(20).max(30);
        const intersection = schema1.and(schema2);

        const results = Array.from({ length: 10 }, () =>
          generator.generate(intersection),
        );

        results.forEach((result) => {
          expect(() => intersection.parse(result)).not.toThrow();
          expect(typeof result).toBe('number');
          expect(result).toBeGreaterThanOrEqual(20);
          expect(result).toBeLessThanOrEqual(30);
        });
      });

      it('string constraint merge', () => {
        const schema1 = z.string().min(5).max(15);
        const schema2 = z.string().min(8).max(12);
        const intersection = schema1.and(schema2);

        const results = Array.from({ length: 5 }, () =>
          generator.generate(intersection),
        );

        results.forEach((result) => {
          expect(() => intersection.parse(result)).not.toThrow();
          expect(typeof result).toBe('string');
          expect((result as string).length).toBeGreaterThanOrEqual(8);
          expect((result as string).length).toBeLessThanOrEqual(12);
        });
      });

      it('BigInt constraint merge', () => {
        const schema1 = z.bigint().min(BigInt(10)).max(BigInt(50));
        const schema2 = z.bigint().min(BigInt(20)).max(BigInt(30));
        const intersection = schema1.and(schema2);

        const results = Array.from({ length: 5 }, () =>
          generator.generate(intersection),
        );

        results.forEach((result) => {
          expect(() => intersection.parse(result)).not.toThrow();
          expect(typeof result).toBe('bigint');
          expect(result).toBeGreaterThanOrEqual(BigInt(20));
          expect(result).toBeLessThanOrEqual(BigInt(30));
        });
      });
    });

    describe('Enum intersection', () => {
      it('Common value Enum intersection', () => {
        const schema1 = z.enum(['a', 'b', 'c', 'd']);
        const schema2 = z.enum(['b', 'c', 'd', 'e']);
        const intersection = schema1.and(schema2);

        const results = Array.from({ length: 10 }, () =>
          generator.generate(intersection),
        );

        results.forEach((result) => {
          expect(() => intersection.parse(result)).not.toThrow();
          expect(['b', 'c', 'd']).toContain(result);
        });
      });

      it('no common value Enum intersection', () => {
        const schema1 = z.enum(['a', 'b']);
        const schema2 = z.enum(['c', 'd']);
        const intersection = schema1.and(schema2);

        expect(() => generator.generate(intersection)).toThrow();
      });
    });

    describe('Literal intersection', () => {
      it('same Literal intersection', () => {
        const schema1 = z.literal('test');
        const schema2 = z.literal('test');
        const intersection = schema1.and(schema2);
        const result = generator.generate(intersection);

        expect(() => intersection.parse(result)).not.toThrow();
        expect(result).toBe('test');
      });

      it('different Literal intersection', () => {
        const schema1 = z.literal('test1');
        const schema2 = z.literal('test2');
        const intersection = schema1.and(schema2);

        expect(() => generator.generate(intersection)).toThrow();
      });
    });

    describe('Union intersection', () => {
      it('Common type Union intersection', () => {
        const schema1 = z.union([z.string(), z.number(), z.boolean()]);
        const schema2 = z.union([z.string(), z.number(), z.date()]);
        const intersection = schema1.and(schema2);

        const results = Array.from({ length: 10 }, () =>
          generator.generate(intersection),
        );

        results.forEach((result) => {
          expect(() => intersection.parse(result)).not.toThrow();
          expect(['string', 'number']).toContain(typeof result);
        });
      });
    });

    describe('Wrapper type intersection', () => {
      it('Optional type intersection', () => {
        const schema1 = z.string().optional();
        const schema2 = z.string().min(3).optional();
        const intersection = schema1.and(schema2);

        const results = Array.from({ length: 10 }, () =>
          generator.generate(intersection),
        );

        results.forEach((result) => {
          expect(() => intersection.parse(result)).not.toThrow();
          if (result !== undefined) {
            expect(typeof result).toBe('string');
            expect((result as string).length).toBeGreaterThanOrEqual(3);
          }
        });
      });

      it('Nullable type intersection', () => {
        const schema1 = z.number().nullable();
        const schema2 = z.number().max(100).nullable();
        const intersection = schema1.and(schema2);

        const results = Array.from({ length: 10 }, () =>
          generator.generate(intersection),
        );

        results.forEach((result) => {
          expect(() => intersection.parse(result)).not.toThrow();
          if (result !== null) {
            expect(typeof result).toBe('number');
            expect(result).toBeLessThanOrEqual(100);
          }
        });
      });

      it('Default type intersection', () => {
        const schema1 = z.string().default('default1');
        const schema2 = z.string().min(5).default('default2');
        const intersection = schema1.and(schema2);
        const result = generator.generate(intersection);

        expect(() => intersection.parse(result)).not.toThrow();
        expect(typeof result).toBe('string');
        expect((result as string).length).toBeGreaterThanOrEqual(5);
      });
    });

    describe('special type priority processing', () => {
      it('any type intersection', () => {
        const anySchema = z.any();
        const stringSchema = z.string().min(5);
        const intersection = anySchema.and(stringSchema);

        const results = Array.from({ length: 5 }, () =>
          generator.generate(intersection),
        );

        results.forEach((result) => {
          expect(() => intersection.parse(result)).not.toThrow();
          expect(typeof result).toBe('string');
          expect((result as string).length).toBeGreaterThanOrEqual(5);
        });
      });

      it('unknown type intersection', () => {
        const unknownSchema = z.unknown();
        const numberSchema = z.number().max(10);
        const intersection = numberSchema.and(unknownSchema);

        const results = Array.from({ length: 5 }, () =>
          generator.generate(intersection),
        );

        results.forEach((result) => {
          expect(() => intersection.parse(result)).not.toThrow();
          expect(typeof result).toBe('number');
          expect(result).toBeLessThanOrEqual(10);
        });
      });
    });

    describe('Map/Set intersection', () => {
      it('Map intersection', () => {
        const schema1 = z.map(z.string(), z.number());
        const schema2 = z.map(z.string(), z.number());
        const intersection = schema1.and(schema2);
        const result = generator.generate(intersection);

        expect(() => schema1.parse(result)).not.toThrow();
        expect(() => schema2.parse(result)).not.toThrow();
        expect(result).toBeInstanceOf(Map);
      });

      it('Set intersection', () => {
        const schema1 = z.set(z.string());
        const schema2 = z.set(z.string());
        const intersection = schema1.and(schema2);
        const result = generator.generate(intersection);

        expect(() => schema1.parse(result)).not.toThrow();
        expect(() => schema2.parse(result)).not.toThrow();
        expect(result).toBeInstanceOf(Set);
      });

      it('Mutually incompatible Map intersection', () => {
        const schema1 = z.map(z.string(), z.number());
        const schema2 = z.map(z.number(), z.string());
        const intersection = schema1.and(schema2);

        expect(() => generator.generate(intersection)).toThrow();
      });
    });

    describe('Error cases', () => {
      it('Mutually incompatible types intersection', () => {
        const stringSchema = z.string();
        const numberSchema = z.number();
        const intersection = stringSchema.and(numberSchema);

        expect(() => generator.generate(intersection)).toThrow();
      });

      it('Mutually incompatible constraint range', () => {
        const schema1 = z.number().min(50).max(100);
        const schema2 = z.number().min(10).max(30);
        const intersection = schema1.and(schema2);

        expect(() => generator.generate(intersection)).toThrow();
      });
    });
  });

  describe('config', () => {
    it('seed', () => {
      const config: MockConfig = { seed: 12345 };
      const generator1 = new ZodMockGenerator(config);
      const generator2 = new ZodMockGenerator(config);

      const schema = z.string();
      const result1 = generator1.generate(schema);
      const result2 = generator2.generate(schema);

      expect(result1).toBe(result2);
    });

    it('locale', () => {
      const config: MockConfig = { locale: 'en' };
      const generator = new ZodMockGenerator(config);

      const schema = z.string();
      const result = generator.generate(schema);

      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('locale array', () => {
      const config: MockConfig = { locale: ['ja', 'en'] };
      const generator = new ZodMockGenerator(config);

      const schema = z.string();
      const result = generator.generate(schema);

      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });
  });

  describe('number range', () => {
    it('min and max', () => {
      const schema = z.number().min(10).max(100);
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(10);
      expect(result).toBeLessThanOrEqual(100);
    });

    it('negative', () => {
      const schema = z.number().negative();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('number');
      expect(result).toBeLessThan(0);
    });

    it('positive', () => {
      const schema = z.number().positive();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    });

    it('nonnegative', () => {
      const schema = z.number().nonnegative();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
    });

    it('nonpositive', () => {
      const schema = z.number().nonpositive();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('number');
      expect(result).toBeLessThanOrEqual(0);
    });

    it('greaterThan', () => {
      const schema = z.number().gt(10);
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(10);
    });

    it('lessThan', () => {
      const schema = z.number().lt(10);
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('number');
      expect(result).toBeLessThan(10);
    });

    it('greaterThanOrEqual', () => {
      const schema = z.number().gte(10);
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(10);
    });

    it('lessThanOrEqual', () => {
      const schema = z.number().lte(10);
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('number');
      expect(result).toBeLessThanOrEqual(10);
    });

    it('BigInt with min and max', () => {
      const schema = z.bigint().min(BigInt(10)).max(BigInt(100));
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('bigint');
      expect(result).toBeGreaterThanOrEqual(BigInt(10));
      expect(result).toBeLessThanOrEqual(BigInt(100));
    });
  });

  describe('error handling', () => {
    it('ZodNever schema returns null', () => {
      const schema = z.never();
      const result = generator.generate(schema);
      expect(result).toBeNull();
    });

    it('number range is invalid', () => {
      const schema = z.number().min(100).max(10);
      expect(() => generator.generate(schema)).toThrow();
    });

    it('intersection value is invalid', () => {
      const left = z.object({ value: z.string() });
      const right = z.string();
      const schema = left.and(right);
      expect(() => generator.generate(schema)).toThrow();
    });
  });

  describe('comprehensive test', () => {
    it('complex schema', () => {
      const schema = z.object({
        id: z.string(),
        user: z.object({
          name: z.string(),
          email: z.email(),
          age: z.number().min(0).max(120).optional(),
          isVerified: z.boolean(),
          tags: z.array(z.string()),
          metadata: z.object({
            createdAt: z.date(),
            updatedAt: z.iso.datetime(),
            preferences: z
              .object({
                theme: z.enum(['light', 'dark']),
                language: z.union([z.literal('ja'), z.literal('en')]),
                notifications: z.boolean().default(true),
              })
              .optional(),
          }),
        }),
        posts: z.array(
          z.object({
            title: z.string(),
            content: z.string(),
            publishedAt: z.date().nullable(),
            tags: z.array(z.string()),
            author: z.object({
              id: z.string(),
              name: z.string(),
            }),
          }),
        ),
        settings: z
          .object({
            isPublic: z.boolean(),
            allowComments: z.boolean().optional(),
          })
          .optional(),
      });

      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
    });
  });
});
