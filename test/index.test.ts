import { describe, expect, it } from 'vitest';
import { z } from 'zod/v4';
import { generateMock, ZodMockGenerator } from '../src/mock-generator';
import type { MockConfig } from '../src/type';

describe('generateMock (関数ベースAPI)', () => {
  const mockConfig: MockConfig = { seed: 1 };

  describe('基本的な型', () => {
    it('文字列を生成できる', () => {
      const schema = z.string();
      const result = generateMock(schema, mockConfig).generate();
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('数値を生成できる', () => {
      const schema = z.number();
      const result = generateMock(schema, mockConfig).generate();
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('number');
    });

    it('intを生成できる(v3)', () => {
      const schema = z.number().int();
      const result = generateMock(schema, mockConfig).generate();
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('number');
    });

    it('intを生成できる', () => {
      const schema = z.int();
      const result = generateMock(schema, mockConfig).generate();
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('number');
    });

    it('int32を生成できる', () => {
      const schema = z.int32();
      const result = generateMock(schema, mockConfig).generate();
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('number');
    });

    it('int64を生成できる', () => {
      const schema = z.int64();
      const result = generateMock(schema, mockConfig).generate();
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('bigint');
    });

    it('uint64を生成できる', () => {
      const schema = z.uint64();
      const result = generateMock(schema, mockConfig).generate();
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('bigint');
    });

    it('float32を生成できる', () => {
      const schema = z.float32();
      const result = generateMock(schema, mockConfig).generate();
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('number');
    });

    it('float64を生成できる', () => {
      const schema = z.float64();
      const result = generateMock(schema, mockConfig).generate();
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('number');
    });

    it('ブール値を生成できる', () => {
      const schema = z.boolean();
      const result = generateMock(schema, mockConfig).generate();
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('boolean');
    });

    it('BigIntを生成できる', () => {
      const schema = z.bigint();
      const result = generateMock(schema, mockConfig).generate();
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('bigint');
    });

    it('Dateを生成できる', () => {
      const schema = z.date();
      const result = generateMock(schema, mockConfig).generate();
      expect(() => schema.parse(result)).not.toThrow();
      expect(result).toBeInstanceOf(Date);
    });

    it('Fileを生成できる', () => {
      const schema = z.file();
      const result = generateMock(schema, mockConfig).generate();
      expect(() => schema.parse(result)).not.toThrow();
      expect(result).toBeInstanceOf(File);
    });

    it('nullを生成できる', () => {
      const schema = z.null();
      const result = generateMock(schema, mockConfig).generate();
      expect(() => schema.parse(result)).not.toThrow();
      expect(result).toBeNull();
    });

    it('undefinedを生成できる', () => {
      const schema = z.undefined();
      const result = generateMock(schema, mockConfig).generate();
      expect(() => schema.parse(result)).not.toThrow();
      expect(result).toBeUndefined();
    });

    it('voidを生成できる', () => {
      const schema = z.void();
      const result = generateMock(schema, mockConfig).generate();
      expect(() => schema.parse(result)).not.toThrow();
      expect(result).toBeUndefined();
    });

    it('anyを生成できる', () => {
      const schema = z.any();
      const result = generateMock(schema, mockConfig).generate();
      expect(() => schema.parse(result)).not.toThrow();
    });

    it('unknownを生成できる', () => {
      const schema = z.unknown();
      const result = generateMock(schema, mockConfig).generate();
      expect(() => schema.parse(result)).not.toThrow();
    });

    it('symbolを生成できる', () => {
      const schema = z.symbol();
      const result = generateMock(schema, mockConfig).generate();
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('symbol');
    });
  });
});

describe('ZodMockGenerator (後方互換)', () => {
  const generator = new ZodMockGenerator({ seed: 1 });

  describe('基本的な型', () => {
    it('文字列を生成できる', () => {
      const schema = z.string();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('数値を生成できる', () => {
      const schema = z.number();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('number');
    });

    it('intを生成できる(v3)', () => {
      const schema = z.number().int();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('number');
    });

    it('intを生成できる', () => {
      const schema = z.int();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('number');
    });

    it('int32を生成できる', () => {
      const schema = z.int32();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('number');
    });

    it('int64を生成できる', () => {
      const schema = z.int64();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('bigint');
    });

    it('uint64を生成できる', () => {
      const schema = z.uint64();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('bigint');
    });

    it('float32を生成できる', () => {
      const schema = z.float32();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('number');
    });

    it('float64を生成できる', () => {
      const schema = z.float64();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('number');
    });

    it('ブール値を生成できる', () => {
      const schema = z.boolean();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('boolean');
    });

    it('BigIntを生成できる', () => {
      const schema = z.bigint();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('bigint');
    });

    it('Dateを生成できる', () => {
      const schema = z.date();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(result).toBeInstanceOf(Date);
    });

    it('Fileを生成できる', () => {
      const schema = z.file();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(result).toBeInstanceOf(File);
    });

    it('nullを生成できる', () => {
      const schema = z.null();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(result).toBeNull();
    });

    it('undefinedを生成できる', () => {
      const schema = z.undefined();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(result).toBeUndefined();
    });

    it('voidを生成できる', () => {
      const schema = z.void();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(result).toBeUndefined();
    });

    it('anyを生成できる', () => {
      const schema = z.any();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
    });

    it('unknownを生成できる', () => {
      const schema = z.unknown();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
    });

    it('symbolを生成できる', () => {
      const schema = z.symbol();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('symbol');
    });
  });

  describe('特殊な文字列フォーマット(v3)', () => {
    it('emailを生成できる', () => {
      const schema = z.string().email();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('URLを生成できる', () => {
      const schema = z.string().url();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('JWTを生成できる', () => {
      const schema = z.string().jwt();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('emojiを生成できる', () => {
      const schema = z.string().emoji();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('guidを生成できる', () => {
      const schema = z.string().guid();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('uuidを生成できる', () => {
      const schema = z.string().uuid();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('uuidv4を生成できる', () => {
      const schema = z.string().uuidv4();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('uuidv6を生成できる', () => {
      const schema = z.string().uuidv6();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('uuidv7を生成できる', () => {
      const schema = z.string().uuidv7();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('nanoidを生成できる', () => {
      const schema = z.string().nanoid();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('cuidを生成できる', () => {
      const schema = z.string().cuid();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('cuid2を生成できる', () => {
      const schema = z.string().cuid2();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('ulidを生成できる', () => {
      const schema = z.string().ulid();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('xidを生成できる', () => {
      const schema = z.string().xid();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('ksuidを生成できる', () => {
      const schema = z.string().ksuid();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('cidrv4を生成できる', () => {
      const schema = z.string().cidrv4();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('cidrv6を生成できる', () => {
      const schema = z.string().cidrv6();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('e164を生成できる', () => {
      const schema = z.string().e164();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('IPv4を生成できる', () => {
      const schema = z.string().ipv4();
      const result = generator.generate(schema);
      expect(typeof result).toBe('string');
    });

    it('IPv6を生成できる', () => {
      const schema = z.string().ipv6();
      const result = generator.generate(schema);
      expect(typeof result).toBe('string');
    });

    it('datetimeを生成できる', () => {
      const schema = z.string().datetime();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('dateを生成できる', () => {
      const schema = z.string().date();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('timeを生成できる', () => {
      const schema = z.string().time();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('durationを生成できる', () => {
      const schema = z.string().duration();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('base64を生成できる', () => {
      const schema = z.string().base64();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('base64urlを生成できる', () => {
      const schema = z.string().base64url();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });
  });

  describe('特殊な文字列フォーマット(v4)', () => {
    it('emailを生成できる', () => {
      const schema = z.email();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('URLを生成できる', () => {
      const schema = z.url();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('JWTを生成できる', () => {
      const schema = z.jwt();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('emojiを生成できる', () => {
      const schema = z.emoji();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('guidを生成できる', () => {
      const schema = z.guid();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('uuidを生成できる', () => {
      const schema = z.uuid();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('uuidv4を生成できる', () => {
      const schema = z.uuidv4();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('uuidv6を生成できる', () => {
      const schema = z.uuidv6();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('uuidv7を生成できる', () => {
      const schema = z.uuidv7();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('nanoidを生成できる', () => {
      const schema = z.nanoid();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('cuidを生成できる', () => {
      const schema = z.cuid();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('cuid2を生成できる', () => {
      const schema = z.cuid2();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('ulidを生成できる', () => {
      const schema = z.ulid();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('xidを生成できる', () => {
      const schema = z.xid();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('ksuidを生成できる', () => {
      const schema = z.ksuid();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('cidrv4を生成できる', () => {
      const schema = z.cidrv4();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('cidrv6を生成できる', () => {
      const schema = z.cidrv6();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('e164を生成できる', () => {
      const schema = z.e164();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('IPv4を生成できる', () => {
      const schema = z.ipv4();
      const result = generator.generate(schema);
      expect(typeof result).toBe('string');
    });

    it('IPv6を生成できる', () => {
      const schema = z.ipv6();
      const result = generator.generate(schema);
      expect(typeof result).toBe('string');
    });

    it('iso datetimeを生成できる', () => {
      const schema = z.iso.datetime();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('iso dateを生成できる', () => {
      const schema = z.iso.date();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('iso timeを生成できる', () => {
      const schema = z.iso.time();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('iso durationを生成できる', () => {
      const schema = z.iso.duration();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('base64を生成できる', () => {
      const schema = z.base64();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('base64urlを生成できる', () => {
      const schema = z.base64url();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });
  });

  describe('複合型', () => {
    it('配列を生成できる', () => {
      const schema = z.array(z.string());
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(Array.isArray(result)).toBe(true);
    });

    it('オブジェクトを生成できる', () => {
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

    it('ネストしたオブジェクトを生成できる', () => {
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

    it('optionalを生成できる', () => {
      const schema = z.object({
        required: z.string(),
        optional: z.string().optional(),
      });
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
    });

    it('nullableを生成できる', () => {
      const schema = z.object({
        required: z.string(),
        nullable: z.string().nullable(),
      });
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
    });

    it('unionを生成できる', () => {
      const schema = z.union([z.string(), z.number(), z.boolean()]);
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
    });

    it('union(or)を生成できる', () => {
      const schema = z.string().or(z.number()).or(z.boolean());
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
    });

    it('enumを生成できる', () => {
      const schema = z.enum(['red', 'green', 'blue']);
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(['red', 'green', 'blue']).toContain(result);
    });

    it('literalを生成できる', () => {
      const schema = z.literal('hello');
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(result).toBe('hello');
    });

    it('literalsを生成できる', () => {
      const schema = z.literal(['hello', 'world']);
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(['hello', 'world']).toContain(result);
    });

    it('defaultを生成できる', () => {
      const schema = z.string().default('default value');
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });
  });

  describe('交差型', () => {
    describe('オブジェクト交差', () => {
      it('基本的なオブジェクト交差を生成できる', () => {
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

      it('複雑なオブジェクト交差を生成できる', () => {
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

    describe('プリミティブ型制約マージ', () => {
      it('数値制約をマージできる', () => {
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

      it('文字列制約をマージできる', () => {
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

      it('BigInt制約をマージできる', () => {
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

    describe('Enum交差', () => {
      it('共通値を持つEnum交差を生成できる', () => {
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

      it('共通値がないEnum交差はエラーになる', () => {
        const schema1 = z.enum(['a', 'b']);
        const schema2 = z.enum(['c', 'd']);
        const intersection = schema1.and(schema2);

        expect(() => generator.generate(intersection)).toThrow();
      });
    });

    describe('リテラル交差', () => {
      it('同じリテラル交差を生成できる', () => {
        const schema1 = z.literal('test');
        const schema2 = z.literal('test');
        const intersection = schema1.and(schema2);
        const result = generator.generate(intersection);

        expect(() => intersection.parse(result)).not.toThrow();
        expect(result).toBe('test');
      });

      it('異なるリテラル交差はエラーになる', () => {
        const schema1 = z.literal('test1');
        const schema2 = z.literal('test2');
        const intersection = schema1.and(schema2);

        expect(() => generator.generate(intersection)).toThrow();
      });
    });

    describe('Union交差', () => {
      it('共通型を持つUnion交差を生成できる', () => {
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

    describe('ラッパー型交差', () => {
      it('Optional型交差を生成できる', () => {
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

      it('Nullable型交差を生成できる', () => {
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

      it('Default型交差を生成できる', () => {
        const schema1 = z.string().default('default1');
        const schema2 = z.string().min(5).default('default2');
        const intersection = schema1.and(schema2);
        const result = generator.generate(intersection);

        expect(() => intersection.parse(result)).not.toThrow();
        expect(typeof result).toBe('string');
        expect((result as string).length).toBeGreaterThanOrEqual(5);
      });
    });

    describe('特殊型優先処理', () => {
      it('any型との交差で相手型を優先する', () => {
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

      it('unknown型との交差で相手型を優先する', () => {
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

    describe('Map/Set交差', () => {
      it('Map交差を生成できる', () => {
        const schema1 = z.map(z.string(), z.number());
        const schema2 = z.map(z.string(), z.number());
        const intersection = schema1.and(schema2);
        const result = generator.generate(intersection);

        expect(() => schema1.parse(result)).not.toThrow();
        expect(() => schema2.parse(result)).not.toThrow();
        expect(result).toBeInstanceOf(Map);
      });

      it('Set交差を生成できる', () => {
        const schema1 = z.set(z.string());
        const schema2 = z.set(z.string());
        const intersection = schema1.and(schema2);
        const result = generator.generate(intersection);

        expect(() => schema1.parse(result)).not.toThrow();
        expect(() => schema2.parse(result)).not.toThrow();
        expect(result).toBeInstanceOf(Set);
      });

      it('互換性のないMap交差はエラーになる', () => {
        const schema1 = z.map(z.string(), z.number());
        const schema2 = z.map(z.number(), z.string());
        const intersection = schema1.and(schema2);

        expect(() => generator.generate(intersection)).toThrow();
      });
    });

    describe('エラーケース', () => {
      it('互換性のない型の交差はエラーになる', () => {
        const stringSchema = z.string();
        const numberSchema = z.number();
        const intersection = stringSchema.and(numberSchema);

        expect(() => generator.generate(intersection)).toThrow();
      });

      it('空の制約範囲はエラーになる', () => {
        const schema1 = z.number().min(50).max(100);
        const schema2 = z.number().min(10).max(30);
        const intersection = schema1.and(schema2);

        expect(() => generator.generate(intersection)).toThrow();
      });
    });
  });

  describe('設定オプション', () => {
    it('seedを設定できる', () => {
      const config: MockConfig = { seed: 12345 };
      const generator1 = new ZodMockGenerator(config);
      const generator2 = new ZodMockGenerator(config);

      const schema = z.string();
      const result1 = generator1.generate(schema);
      const result2 = generator2.generate(schema);

      expect(result1).toBe(result2);
    });

    it('localeを設定できる', () => {
      const config: MockConfig = { locale: 'en' };
      const generator = new ZodMockGenerator(config);

      const schema = z.string();
      const result = generator.generate(schema);

      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });

    it('複数のlocaleを設定できる', () => {
      const config: MockConfig = { locale: ['ja', 'en'] };
      const generator = new ZodMockGenerator(config);

      const schema = z.string();
      const result = generator.generate(schema);

      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('string');
    });
  });

  describe('数値の範囲制限', () => {
    it('最小値・最大値を持つ数値を生成できる', () => {
      const schema = z.number().min(10).max(100);
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(10);
      expect(result).toBeLessThanOrEqual(100);
    });

    it('negativeを持つ数値を生成できる', () => {
      const schema = z.number().negative();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('number');
      expect(result).toBeLessThan(0);
    });

    it('positiveを持つ数値を生成できる', () => {
      const schema = z.number().positive();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(0);
    });

    it('nonnegativeを持つ数値を生成できる', () => {
      const schema = z.number().nonnegative();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
    });

    it('nonpositiveを持つ数値を生成できる', () => {
      const schema = z.number().nonpositive();
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('number');
      expect(result).toBeLessThanOrEqual(0);
    });

    it('greaterThanを持つ数値を生成できる', () => {
      const schema = z.number().gt(10);
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(10);
    });

    it('lessThanを持つ数値を生成できる', () => {
      const schema = z.number().lt(10);
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('number');
      expect(result).toBeLessThan(10);
    });

    it('greaterThanOrEqualを持つ数値を生成できる', () => {
      const schema = z.number().gte(10);
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(10);
    });

    it('lessThanOrEqualを持つ数値を生成できる', () => {
      const schema = z.number().lte(10);
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('number');
      expect(result).toBeLessThanOrEqual(10);
    });

    it('最小値・最大値を持つBigIntを生成できる', () => {
      const schema = z.bigint().min(BigInt(10)).max(BigInt(100));
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('bigint');
      expect(result).toBeGreaterThanOrEqual(BigInt(10));
      expect(result).toBeLessThanOrEqual(BigInt(100));
    });
  });

  describe('エラーハンドリング', () => {
    it('ZodNeverスキーマでnullを返す', () => {
      const schema = z.never();
      const result = generator.generate(schema);
      expect(result).toBeNull();
    });

    it('数値範囲が適切でない', () => {
      const schema = z.number().min(100).max(10);
      expect(() => generator.generate(schema)).toThrow();
    });

    it('交差した値が適切でない', () => {
      const left = z.object({ value: z.string() });
      const right = z.string();
      const schema = left.and(right);
      expect(() => generator.generate(schema)).toThrow();
    });
  });

  describe('包括的なテスト', () => {
    it('複雑なスキーマを生成できる', () => {
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
