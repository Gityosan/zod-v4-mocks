import { describe, expect, it } from 'vitest';
import { z } from 'zod/v4';
import { initGenerator } from '../src';

describe('Complex types', () => {
  describe('ZodNever handling', () => {
    it('handles ZodNever in partialRecord correctly', () => {
      const schema = z.partialRecord(
        z.enum(['id', 'name', 'email']),
        z.string(),
      );

      for (let i = 0; i < 100; i++) {
        const gen = initGenerator({ seed: i });
        const result = gen.generate(schema);
        expect(() => schema.parse(result)).not.toThrow();
        expect(typeof result).toBe('object');

        // Verify all keys are valid
        for (const key of Object.keys(result)) {
          expect(['id', 'name', 'email']).toContain(key);
        }
      }
    });

    it('can generate empty object with partialRecord', () => {
      const schema = z.partialRecord(z.enum(['a', 'b']), z.number());
      const gen = initGenerator({ seed: 42, record: { min: 0, max: 0 } });
      const result = gen.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();
      expect(Object.keys(result)).toHaveLength(0);
    });

    it('works with real-world partialRecord use case', () => {
      const CommonModuleType = z.enum(['gp', 'bp', 'wp']);
      const ModuleStatus = z.object({
        status: z.string(),
        timestamp: z.number(),
      });

      const schema = z.partialRecord(
        CommonModuleType,
        ModuleStatus.optional(),
      );

      for (let i = 0; i < 50; i++) {
        const gen = initGenerator({ seed: i });
        const result = gen.generate(schema);
        expect(() => schema.parse(result)).not.toThrow();

        // Verify all keys are from the enum
        for (const key of Object.keys(result)) {
          expect(['gp', 'bp', 'wp']).toContain(key);
        }
      }
    });

    it('handles ZodNever in union correctly', () => {
      // This schema is not practical, but test as an edge case
      const schema = z.union([z.string(), z.never()]);
      const gen = initGenerator({ seed: 42 });
      const result = gen.generate(schema);

      // Should select z.string() since z.never() returns OMIT_SYMBOL
      expect(typeof result).toBe('string');
    });

    it('filters ZodNever in array correctly', () => {
      // Not typical, but technically possible
      const schema = z.object({
        items: z.array(z.union([z.string(), z.never()])),
      });

      const gen = initGenerator({ seed: 42 });
      const result = gen.generate(schema);
      expect(() => schema.parse(result)).not.toThrow();

      // Verify all array elements are strings
      for (const item of result.items) {
        expect(typeof item).toBe('string');
      }
    });
  });
});
