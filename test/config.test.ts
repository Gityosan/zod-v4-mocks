import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  type CustomGeneratorType,
  initGenerator,
  type MockConfig,
} from '../src';

describe('initGenerator (functional base API)', () => {
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
});
