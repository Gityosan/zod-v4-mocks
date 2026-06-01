import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initGenerator, type LocaleType } from '../../src';
import { z } from 'zod';

/**
 * Property-based round-trip test.
 *
 * The defining invariant of a mock generator: every value it produces for a
 * schema must satisfy that schema. We fuzz a wide space of randomly-shaped Zod
 * schemas and assert `schema.parse(generate(schema))` never throws — covering
 * combinations the example-based suites can't enumerate by hand.
 *
 * We also fuzz the *config* (see `safeConfig`): the default seed is fixed at 1,
 * so without this each schema shape is only ever checked against a single
 * deterministic value. Varying the seed, collection sizes, probabilities and
 * locale checks many concrete draws per shape and exercises config×schema
 * interactions. Only invariant-preserving knobs are fuzzed — value-overriding
 * features (keyMapping / supply / override / custom generators) are excluded
 * because they can intentionally produce values that don't match the schema.
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

// A {min,max} pair with min <= max, for collection-size config knobs.
const sizeRange = fc
  .tuple(fc.nat({ max: 4 }), fc.nat({ max: 4 }))
  .map(([a, b]) => ({ min: Math.min(a, b), max: Math.max(a, b) }));

// Extremes (0, 1) are deliberately included: "always omit" / "always include".
const probability = fc.constantFrom(0, 0.5, 1);

/**
 * Invariant-preserving config: changing any of these must not make a generated
 * mock stop satisfying its schema. Excludes value-overriding features on
 * purpose (see file header). `seed` is the highest-value knob — it turns the
 * single deterministic draw per shape into many.
 */
const safeConfig = fc.record({
  seed: fc.integer({ min: 0, max: 2 ** 31 - 1 }),
  array: sizeRange,
  map: sizeRange,
  set: sizeRange,
  record: sizeRange,
  optionalProbability: probability,
  nullableProbability: probability,
  defaultProbability: probability,
  locale: fc.constantFrom<LocaleType>('en', 'ja', 'fr', 'de'),
});

describe('round-trip: generate(schema) always parses against schema', () => {
  it('produces values valid for arbitrary schemas and configs', () => {
    fc.assert(
      fc.property(zodSchema, safeConfig, (schema, config) => {
        const value = initGenerator(config).generate(schema);
        expect(() => schema.parse(value)).not.toThrow();
      }),
      { numRuns: 300 },
    );
  });

  it('generateMany values are all valid', () => {
    fc.assert(
      fc.property(
        zodSchema,
        safeConfig,
        fc.integer({ min: 0, max: 5 }),
        (schema, config, count) => {
          const values = initGenerator(config).generateMany(schema, count);
          expect(values).toHaveLength(count);
          for (const value of values) {
            expect(() => schema.parse(value)).not.toThrow();
          }
        },
      ),
      { numRuns: 150 },
    );
  });
});

describe('determinism: identical config reproduces identical output', () => {
  // Freeze the clock: faker anchors date generation to the current time
  // (refDate defaults to `new Date()`), so without a fixed clock two calls land
  // on slightly different instants even under the same seed. With time frozen,
  // this verifies the real contract: same clock + same config => identical output.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00.000Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('two generators with the same config produce deep-equal values', () => {
    fc.assert(
      fc.property(zodSchema, safeConfig, (schema, config) => {
        const first = initGenerator(config).generate(schema);
        const second = initGenerator(config).generate(schema);
        expect(second).toStrictEqual(first);
      }),
      { numRuns: 200 },
    );
  });
});

/**
 * Portable serialization round-trips losslessly. The value space `zodSchema`
 * draws from (primitives, Date, BigInt, arrays, tuples, unions, objects with
 * optional/nullable) is exactly what `serializePortable` handles synchronously
 * and without loss, so strict deep-equality must hold. Symbols, File/Blob and
 * Map/Set need identity / async / content care and are covered separately
 * (example tests + the Symbol property below).
 */
describe('portable round-trip: deserializePortable(serializePortable(x)) deep-equals x', () => {
  it('round-trips arbitrary generated mocks', () => {
    fc.assert(
      fc.property(zodSchema, safeConfig, (schema, config) => {
        const g = initGenerator(config);
        const value = g.generate(schema);
        expect(g.deserializePortable(g.serializePortable(value))).toStrictEqual(value);
      }),
      { numRuns: 300 },
    );
  });

  it('round-trips through base64 encoding', () => {
    fc.assert(
      fc.property(zodSchema, safeConfig, (schema, config) => {
        const g = initGenerator(config);
        const value = g.generate(schema);
        const encoded = g.serializePortable(value, { base64: true });
        expect(g.deserializePortable(encoded, { base64: true })).toStrictEqual(value);
      }),
      { numRuns: 150 },
    );
  });
});

/**
 * The v8 binary path (Node-only) must round-trip the same value space —
 * hardening `serializeBinary` / `deserialize`, previously only example-tested.
 */
describe('binary round-trip: deserialize(serializeBinary(x)) deep-equals x', () => {
  it('round-trips arbitrary generated mocks', () => {
    fc.assert(
      fc.property(zodSchema, safeConfig, (schema, config) => {
        const g = initGenerator(config);
        const value = g.generate(schema);
        expect(g.deserialize(g.serializeBinary(value))).toStrictEqual(value);
      }),
      { numRuns: 200 },
    );
  });
});

/**
 * The greft-codec path (cross-runtime / cross-language) must round-trip the
 * same value space — hardening `serializeGreft` / `deserializeGreft`.
 */
describe('greft round-trip: deserializeGreft(serializeGreft(x)) deep-equals x', () => {
  it('round-trips arbitrary generated mocks', () => {
    fc.assert(
      fc.property(zodSchema, safeConfig, (schema, config) => {
        const g = initGenerator(config);
        const value = g.generate(schema);
        expect(g.deserializeGreft(g.serializeGreft(value))).toStrictEqual(value);
      }),
      { numRuns: 200 },
    );
  });
});

/**
 * Symbols cannot use a plain deep-equality round-trip: a described symbol's
 * identity intentionally changes across the boundary. We instead assert the
 * documented guarantees over arbitrary symbol sets — description preserved,
 * registry identity recovered, and identity shared within one payload kept.
 * Each symbol is index-prefixed so it stays unique (distinct Set/Map keys).
 */
const symbolSpec = fc.oneof(
  fc.string().map((d) => ({ tag: 'desc' as const, d })),
  fc.string({ minLength: 1, maxLength: 8 }).map((k) => ({ tag: 'for' as const, k })),
);

describe('portable Symbol round-trip (property)', () => {
  it('preserves description, registry identity, and shared identity', () => {
    fc.assert(
      fc.property(fc.array(symbolSpec, { minLength: 1, maxLength: 6 }), (specs) => {
        const g = initGenerator();
        const symbols = specs.map((s, i) =>
          s.tag === 'for' ? Symbol.for(`zv4m-prop:${i}:${s.k}`) : Symbol(`${i}:${s.d}`),
        );
        const payload = {
          list: symbols,
          dup: symbols[0],
          nested: { again: symbols[0] },
          set: new Set(symbols),
          map: new Map(symbols.map((sym, i) => [sym, i] as const)),
        };

        const restored = g.deserializePortable<typeof payload>(
          g.serializePortable(payload),
        );

        specs.forEach((spec, i) => {
          const sym = restored.list[i];
          expect(typeof sym).toBe('symbol');
          if (spec.tag === 'for') {
            expect(sym).toBe(Symbol.for(`zv4m-prop:${i}:${spec.k}`));
          } else {
            expect(sym.description).toBe(`${i}:${spec.d}`);
          }
          // The same restored symbol is reused as the Map key and Set member.
          expect(restored.map.get(sym)).toBe(i);
          expect(restored.set.has(sym)).toBe(true);
        });

        // Identity shared within the payload survives the round-trip.
        expect(restored.dup).toBe(restored.list[0]);
        expect(restored.nested.again).toBe(restored.list[0]);
        expect(restored.set.size).toBe(symbols.length);
      }),
      { numRuns: 200 },
    );
  });
});
