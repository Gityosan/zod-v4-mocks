import { describe, expect, it } from 'vitest';
import { z } from 'zod/v4';
import { ZodMockGenerator, type MockConfig } from '../src/mock-generator';

describe('ZodMockGenerator', () => {
  const generator = new ZodMockGenerator({});

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
    it('最小値・最大値を持つx', () => {
      const schema = z.number().min(10).max(100);
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(10);
      expect(result).toBeLessThanOrEqual(100);
    });

    it('最小値・最大値を持つBigIntを生成できる', () => {
      const schema = z.bigint().min(BigInt(10)).max(BigInt(100));
      const result = generator.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(typeof result).toBe('bigint');
    });
  });

  describe('エラーハンドリング', () => {
    it('ZodNeverスキーマでnullを返す', () => {
      const schema = z.never();
      const result = generator.generate(schema);
      expect(result).toBeNull();
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
