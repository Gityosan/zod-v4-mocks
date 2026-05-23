import { describe, expectTypeOf, it } from 'vitest';
import { z } from 'zod';
import { initGenerator } from '../src';

/**
 * Type-level tests (checked by `pnpm run test:types`, i.e. vitest --typecheck).
 *
 * The library's headline promise is inference: `generate(schema)` returns the
 * value type a consumer would write `z.infer<typeof schema>` to get. These
 * assertions pin that contract so a refactor of the overloads can't silently
 * widen results to `any`/`unknown` or drop optionality. We mostly assert
 * equality against `z.infer<...>` directly — that *is* the contract — plus a
 * few concrete shapes for readability.
 */

const g = initGenerator();

describe('generate() inference', () => {
  it('primitives map to their value types', () => {
    expectTypeOf(g.generate(z.string())).toEqualTypeOf<string>();
    expectTypeOf(g.generate(z.number())).toEqualTypeOf<number>();
    expectTypeOf(g.generate(z.boolean())).toEqualTypeOf<boolean>();
    expectTypeOf(g.generate(z.date())).toEqualTypeOf<Date>();
  });

  it('returns exactly z.infer<T> for composite schemas', () => {
    const obj = z.object({
      id: z.string(),
      age: z.number().optional(),
      tags: z.array(z.string()),
      role: z.enum(['admin', 'user']),
    });
    expectTypeOf(g.generate(obj)).toEqualTypeOf<z.infer<typeof obj>>();

    const nested = z.object({
      user: z.object({ name: z.string(), nick: z.string().nullable() }),
      scores: z.array(z.number()),
    });
    expectTypeOf(g.generate(nested)).toEqualTypeOf<z.infer<typeof nested>>();

    const union = z.union([z.string(), z.number()]);
    expectTypeOf(g.generate(union)).toEqualTypeOf<string | number>();

    const tuple = z.tuple([z.string(), z.number()]);
    expectTypeOf(g.generate(tuple)).toEqualTypeOf<[string, number]>();
  });

  it('optionality is preserved, not flattened to any', () => {
    const schema = z.object({ a: z.string(), b: z.number().optional() });
    expectTypeOf(g.generate(schema)).toEqualTypeOf<{
      a: string;
      b?: number | undefined;
    }>();
    // Guard against regressions to `any`.
    expectTypeOf(g.generate(z.string())).not.toBeAny();
  });
});

describe('generateMany() / factory() / multiGenerate()', () => {
  it('generateMany returns an array of the inferred type', () => {
    const schema = z.object({ id: z.string() });
    expectTypeOf(g.generateMany(schema, 3)).toEqualTypeOf<
      z.infer<typeof schema>[]
    >();
  });

  it('factory().next/take are typed from the schema', () => {
    const f = g.factory(z.number());
    expectTypeOf(f.next()).toEqualTypeOf<number>();
    expectTypeOf(f.take(2)).toEqualTypeOf<number[]>();
  });

  it('multiGenerate maps each key to its inferred type', () => {
    const result = g.multiGenerate({ a: z.string(), b: z.number() });
    expectTypeOf(result).toEqualTypeOf<{ a: string; b: number }>();
  });
});
