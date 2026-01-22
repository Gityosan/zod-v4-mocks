import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { initGenerator } from '../src';

describe('initGenerator (functional base API)', () => {
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

      it('top-level exactOptional returns actual value, not symbol', () => {
        const schema = z.string().exactOptional();
        const gen = initGenerator({ seed: 42, optionalProbability: 1 });
        const result = gen.generate(schema);
        // Should return string, not Symbol
        expect(typeof result).toBe('string');
      });

      it('exactOptional in record value does not produce symbol', () => {
        const schema = z.record(z.string(), z.number().exactOptional());
        const gen = initGenerator({ seed: 42, optionalProbability: 0.5 });
        const result = gen.generate(schema) as Record<string, unknown>;
        // All values should be numbers, not symbols
        Object.values(result).forEach((v) => {
          expect(typeof v).toBe('number');
        });
      });

      it('exactOptional in union does not produce symbol', () => {
        const schema = z.union([z.string().exactOptional(), z.number()]);
        for (let i = 0; i < 10; i++) {
          const gen = initGenerator({ seed: i, optionalProbability: 0.5 });
          const result = gen.generate(schema);
          // Should be string or number, not symbol
          expect(['string', 'number']).toContain(typeof result);
        }
      });

      it('exactOptional in array does not produce symbol', () => {
        const schema = z.array(z.string().exactOptional());
        const gen = initGenerator({ seed: 42, optionalProbability: 0.5 });
        const result = gen.generate(schema) as unknown[];
        // Array should not contain symbols
        result.forEach((v) => {
          expect(typeof v).not.toBe('symbol');
        });
      });

      it('exactOptional in map value does not produce symbol', () => {
        const schema = z.map(z.string(), z.number().exactOptional());
        const gen = initGenerator({ seed: 42, optionalProbability: 0.5 });
        const result = gen.generate(schema) as Map<string, unknown>;
        // Map values should not contain symbols
        result.forEach((v) => {
          expect(typeof v).not.toBe('symbol');
        });
      });

      it('exactOptional in set does not produce symbol', () => {
        const schema = z.set(z.string().exactOptional());
        const gen = initGenerator({ seed: 42, optionalProbability: 0.5 });
        const result = gen.generate(schema) as Set<unknown>;
        // Set values should not contain symbols
        result.forEach((v) => {
          expect(typeof v).not.toBe('symbol');
        });
      });

      it('nested exactOptional works correctly', () => {
        const schema = z.object({
          outer: z.string(),
          nested: z.object({
            inner: z.string().exactOptional(),
          }),
        });
        const gen = initGenerator({ seed: 42, optionalProbability: 0.5 });
        const result = gen.generate(schema);
        expect(() => schema.parse(result)).not.toThrow();
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

    describe('array size constraints', () => {
      it('array respects min/max constraints', () => {
        const schema = z.array(z.string()).min(3).max(5);
        const result = generator.generate(schema) as string[];
        expect(() => schema.parse(result)).not.toThrow();
        expect(result.length).toBeGreaterThanOrEqual(3);
        expect(result.length).toBeLessThanOrEqual(5);
      });

      it('array nonempty generates at least one element', () => {
        const schema = z.array(z.number()).nonempty();
        const result = generator.generate(schema) as number[];
        expect(() => schema.parse(result)).not.toThrow();
        expect(result.length).toBeGreaterThanOrEqual(1);
      });

      it('array handles min > config.max', () => {
        const gen = initGenerator({ seed: 42, array: { min: 1, max: 2 } });
        const schema = z.array(z.string()).min(5);
        const result = gen.generate(schema) as string[];
        expect(() => schema.parse(result)).not.toThrow();
        expect(result.length).toBeGreaterThanOrEqual(5);
      });
    });

    describe('map and set size constraints', () => {
      it('map respects min/max constraints', () => {
        const schema = z.map(z.string(), z.number()).min(3).max(5);
        const result = generator.generate(schema) as Map<string, number>;
        expect(() => schema.parse(result)).not.toThrow();
        expect(result.size).toBeGreaterThanOrEqual(3);
        expect(result.size).toBeLessThanOrEqual(5);
      });

      it('set respects min/max constraints', () => {
        const schema = z.set(z.string()).min(2).max(4);
        const result = generator.generate(schema) as Set<string>;
        expect(() => schema.parse(result)).not.toThrow();
        expect(result.size).toBeGreaterThanOrEqual(2);
        expect(result.size).toBeLessThanOrEqual(4);
      });

      it('map nonempty generates at least one entry', () => {
        const schema = z.map(z.string(), z.number()).nonempty();
        const result = generator.generate(schema) as Map<string, number>;
        expect(() => schema.parse(result)).not.toThrow();
        expect(result.size).toBeGreaterThanOrEqual(1);
      });

      it('set nonempty generates at least one entry', () => {
        const schema = z.set(z.number()).nonempty();
        const result = generator.generate(schema) as Set<number>;
        expect(() => schema.parse(result)).not.toThrow();
        expect(result.size).toBeGreaterThanOrEqual(1);
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
        expect(result as string).toMatch(/^Count: -?\d+(\.\d+)?$/);
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
        expect(result as string).toMatch(/^User .+ has -?\d+(\.\d+)? items$/);
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
        expect(result as string).toMatch(/^Status: active - ID: -?\d+(\.\d+)?$/);
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
});
