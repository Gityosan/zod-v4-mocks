import { describe, expect, it } from 'vitest';
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
