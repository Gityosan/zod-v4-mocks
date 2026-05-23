import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { initGenerator } from '../src';

/**
 * Property-based round-trip test.
 *
 * The defining invariant of a mock generator: every value it produces for a
 * schema must satisfy that schema. We fuzz a wide space of randomly-shaped Zod
 * schemas and assert `schema.parse(generate(schema))` never throws — covering
 * combinations the example-based suites can't enumerate by hand.
 *
 * Known boundary (intentionally excluded): `.optional()` as a *fixed tuple
 * slot*. Optionality is implemented with an internal OMIT_SYMBOL that is
 * filtered out of objects/arrays, but a fixed-length tuple cannot drop a slot,
 * so the symbol would leak. The library already warns about this at runtime, so
 * we keep `.optional()`/`.nullable()` to object properties (and `.nullable()`,
 * which yields a real `null`, anywhere). Extend `leaf`/`core` to grow coverage;
 * fast-check reports any counterexample with the exact seed for reproduction.
 */

const zodSchema: fc.Arbitrary<z.ZodType> = fc.letrec<{
  leaf: z.ZodType;
  core: z.ZodType;
}>((tie) => ({
  leaf: fc.constantFrom<z.ZodType>(
    z.string(),
    z.string().min(3).max(12),
    z.number(),
    z.number().int().min(0).max(1000),
    z.boolean(),
    z.bigint(),
    z.date(),
    z.literal('fixed'),
    z.enum(['red', 'green', 'blue']),
    z.email(),
    z.uuid(),
    z.url(),
    z.string().regex(/^[a-z]{4}-\d{3}$/),
  ),
  // `core` never carries top-level optionality, so it is safe to drop into a
  // tuple slot. Optionality is introduced only on object properties below.
  core: fc.oneof(
    { maxDepth: 3, depthIdentifier: 'schema' },
    tie('leaf'),
    tie('leaf').map((s) => s.nullable()),
    tie('core').map((s) => z.array(s)),
    fc.tuple(tie('core'), tie('core')).map(([a, b]) => z.tuple([a, b])),
    fc.tuple(tie('core'), tie('core')).map(([a, b]) => z.union([a, b])),
    fc
      .uniqueArray(
        fc.tuple(
          fc.stringMatching(/^[a-z]{1,6}$/),
          fc.oneof(
            tie('core'),
            tie('core').map((s) => s.optional()),
            tie('core').map((s) => s.nullable()),
          ),
        ),
        { selector: ([k]) => k, minLength: 1, maxLength: 4 },
      )
      .map((entries) => z.object(Object.fromEntries(entries))),
  ),
})).core;

describe('round-trip: generate(schema) always parses against schema', () => {
  it('produces values valid for arbitrary schemas', () => {
    fc.assert(
      fc.property(zodSchema, (schema) => {
        const value = initGenerator().generate(schema);
        expect(() => schema.parse(value)).not.toThrow();
      }),
      { numRuns: 300 },
    );
  });

  it('generateMany values are all valid', () => {
    fc.assert(
      fc.property(zodSchema, fc.integer({ min: 0, max: 5 }), (schema, count) => {
        const values = initGenerator().generateMany(schema, count);
        expect(values).toHaveLength(count);
        for (const value of values) {
          expect(() => schema.parse(value)).not.toThrow();
        }
      }),
      { numRuns: 150 },
    );
  });
});
