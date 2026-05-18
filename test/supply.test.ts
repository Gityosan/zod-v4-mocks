import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { initGenerator } from '../src';

describe('supplyRef', () => {
  it('replaces a specific subschema by reference', () => {
    const Name = z.string();
    const Schema = z.object({ name: Name, other: z.string() });
    const result = initGenerator()
      .supplyRef(Name, 'FIXED')
      .generate(Schema);
    expect(result.name).toBe('FIXED');
    expect(result.other).not.toBe('FIXED');
  });

  it('does not match copies of the same schema', () => {
    const Schema = z.object({ a: z.string(), b: z.string() });
    const result = initGenerator()
      .supplyRef(z.string(), 'X') // a different reference
      .generate(Schema);
    expect(result.a).not.toBe('X');
    expect(result.b).not.toBe('X');
  });

  it('first registration wins on conflict', () => {
    const Name = z.string();
    const Schema = z.object({ name: Name });
    const result = initGenerator()
      .supplyRef(Name, 'first')
      .supplyRef(Name, 'second')
      .generate(Schema);
    expect(result.name).toBe('first');
  });
});

describe('supplyPath - object', () => {
  it('targets specific object key', () => {
    const Schema = z.object({
      name: z.string(),
      age: z.number(),
    });
    const result = initGenerator()
      .supplyPath(['name'], 'Alice')
      .generate(Schema);
    expect(result.name).toBe('Alice');
    expect(typeof result.age).toBe('number');
  });

  it('targets nested object key', () => {
    const Schema = z.object({
      user: z.object({
        profile: z.object({
          name: z.string(),
        }),
      }),
    });
    const result = initGenerator()
      .supplyPath(['user', 'profile', 'name'], 'NESTED')
      .generate(Schema);
    expect(result.user.profile.name).toBe('NESTED');
  });
});

describe('supplyPath - array', () => {
  it('targets specific index', () => {
    const Schema = z.array(z.string());
    const result = initGenerator({ array: { min: 5, max: 5 } })
      .supplyPath([0], 'first')
      .generate(Schema);
    expect(result[0]).toBe('first');
  });

  it('extends array length when index exceeds random length', () => {
    const Schema = z.array(z.string());
    const result = initGenerator({ array: { min: 1, max: 1 } })
      .supplyPath([5], 'sixth')
      .generate(Schema);
    expect(result.length).toBeGreaterThanOrEqual(6);
    expect(result[5]).toBe('sixth');
  });

  it('$item targets all elements', () => {
    const Schema = z.array(z.string());
    const result = initGenerator({ array: { min: 3, max: 3 } })
      .supplyPath(['$item'], 'X')
      .generate(Schema);
    expect(result).toEqual(['X', 'X', 'X']);
  });

  it('specific index beats $item', () => {
    const Schema = z.array(z.string());
    const result = initGenerator({ array: { min: 3, max: 3 } })
      .supplyPath(['$item'], 'X')
      .supplyPath([1], 'Y')
      .generate(Schema);
    expect(result[0]).toBe('X');
    expect(result[1]).toBe('Y');
    expect(result[2]).toBe('X');
  });

  it('targets nested object property in array', () => {
    const Schema = z.array(z.object({ name: z.string() }));
    const result = initGenerator({ array: { min: 3, max: 3 } })
      .supplyPath(['$item', 'name'], 'shared')
      .generate(Schema);
    expect(result.every((u) => u.name === 'shared')).toBe(true);
  });
});

describe('supplyPath - tuple', () => {
  it('targets specific tuple index', () => {
    const Schema = z.tuple([z.string(), z.number(), z.boolean()]);
    const result = initGenerator()
      .supplyPath([0], 'A')
      .supplyPath([1], 42)
      .generate(Schema);
    expect(result[0]).toBe('A');
    expect(result[1]).toBe(42);
    expect(typeof result[2]).toBe('boolean');
  });
});

describe('supplyPath - record', () => {
  it('injects specific string key', () => {
    const Schema = z.record(z.string(), z.number());
    const result = initGenerator({ record: { min: 1, max: 2 } })
      .supplyPath(['alice'], 100)
      .generate(Schema);
    expect(result['alice']).toBe(100);
  });

  it('$value applies to all values', () => {
    const Schema = z.record(z.string(), z.number());
    const result = initGenerator({ record: { min: 3, max: 3 } })
      .supplyPath(['$value'], 7)
      .generate(Schema);
    for (const v of Object.values(result)) {
      expect(v).toBe(7);
    }
  });

  it('specific key beats $value', () => {
    const Schema = z.record(z.string(), z.number());
    const result = initGenerator({ record: { min: 3, max: 3 } })
      .supplyPath(['$value'], 7)
      .supplyPath(['alice'], 999)
      .generate(Schema);
    expect(result['alice']).toBe(999);
  });
});

describe('supplyPath - record nested', () => {
  it('injects record entry inside an object', () => {
    const Schema = z.object({
      scores: z.record(z.string(), z.number()),
    });
    const result = initGenerator()
      .supplyPath(['scores', 'alice'], 999)
      .generate(Schema);
    expect(result.scores['alice']).toBe(999);
  });
});

describe('supplyPath - map', () => {
  it('injects specific string key', () => {
    const Schema = z.map(z.string(), z.number());
    const result = initGenerator({ map: { min: 1, max: 2 } })
      .supplyPath(['alice'], 100)
      .generate(Schema);
    expect(result.get('alice')).toBe(100);
  });

  it('injects specific number key', () => {
    const Schema = z.map(z.number(), z.string());
    const result = initGenerator({ map: { min: 1, max: 2 } })
      .supplyPath([42], 'answer')
      .generate(Schema);
    expect(result.get(42)).toBe('answer');
  });

  it('injects specific symbol key', () => {
    const KEY = Symbol('user');
    const Schema = z.map(z.symbol(), z.number());
    const result = initGenerator({ map: { min: 0, max: 0 } })
      .supplyPath([KEY], 7)
      .generate(Schema);
    expect(result.get(KEY)).toBe(7);
  });

  it('$value applies to all values', () => {
    const Schema = z.map(z.string(), z.number());
    const result = initGenerator({ map: { min: 2, max: 2 } })
      .supplyPath(['$value'], 99)
      .generate(Schema);
    for (const v of result.values()) {
      expect(v).toBe(99);
    }
  });
});

describe('supplyPath - set', () => {
  it('$item replaces all members', () => {
    const Schema = z.set(z.string());
    const result = initGenerator({ set: { min: 3, max: 3 } })
      .supplyPath(['$item'], 'tag')
      .generate(Schema);
    // Set dedupes: after $item all become "tag", set has size 1
    expect(result.size).toBe(1);
    expect(result.has('tag')).toBe(true);
  });
});

describe('supplyPath - replace whole value', () => {
  it('empty path replaces top-level result', () => {
    const Schema = z.object({ x: z.string() });
    const result = initGenerator()
      .supplyPath([], { x: 'replaced' })
      .generate(Schema);
    expect(result).toEqual({ x: 'replaced' });
  });
});

describe('supplyPath + supplyRef interaction', () => {
  it('supplyPath beats supplyRef for the targeted location', () => {
    const Name = z.string();
    const Schema = z.object({
      a: Name,
      b: Name,
    });
    const result = initGenerator()
      .supplyRef(Name, 'ref')
      .supplyPath(['a'], 'path')
      .generate(Schema);
    expect(result.a).toBe('path');
    expect(result.b).toBe('ref');
  });
});

describe('z.custom via meta', () => {
  it('uses meta.mock function', () => {
    const FileLike = z.custom<{ name: string }>((v) => typeof v === 'object').meta({
      mock: () => ({ name: 'demo.txt' }),
    });
    const Schema = z.object({ file: FileLike });
    const result = initGenerator().generate(Schema);
    expect(result.file).toEqual({ name: 'demo.txt' });
  });

  it('uses meta.mock static value', () => {
    const FileLike = z.custom<number>((v) => typeof v === 'number').meta({
      mock: 42,
    });
    const result = initGenerator().generate(FileLike);
    expect(result).toBe(42);
  });

  it('respects customMockKey config', () => {
    const FileLike = z.custom<string>((v) => typeof v === 'string').meta({
      myMock: () => 'aaa',
    });
    const result = initGenerator({ customMockKey: 'myMock' }).generate(FileLike);
    expect(result).toBe('aaa');
  });

  it('omits the property when no mock is provided', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const FileLike = z.custom<string>((v) => typeof v === 'string');
    const Schema = z.object({
      a: z.string(),
      b: FileLike,
    });
    const result = initGenerator().generate(Schema);
    expect('b' in result).toBe(false);
    expect('a' in result).toBe(true);
    warn.mockRestore();
  });

  it('z.instanceof works via meta', () => {
    class MyClass {
      constructor(public n: number) {}
    }
    const Schema = z.instanceof(MyClass).meta({
      mock: () => new MyClass(7),
    });
    const result = initGenerator().generate(Schema);
    expect(result).toBeInstanceOf(MyClass);
    expect(result.n).toBe(7);
  });

  it('supplyRef beats meta.mock', () => {
    const Custom = z.custom<number>((v) => typeof v === 'number').meta({
      mock: () => 1,
    });
    const result = initGenerator().supplyRef(Custom, 99).generate(Custom);
    expect(result).toBe(99);
  });
});

describe('generateMany / factory', () => {
  it('generateMany returns N items', () => {
    const Schema = z.string();
    const out = initGenerator().generateMany(Schema, 5);
    expect(out).toHaveLength(5);
    expect(out.every((s) => typeof s === 'string')).toBe(true);
  });

  it('generateMany returns [] for count 0', () => {
    expect(initGenerator().generateMany(z.string(), 0)).toEqual([]);
  });

  it('generateMany throws on negative count', () => {
    expect(() => initGenerator().generateMany(z.string(), -1)).toThrow();
  });

  it('factory.next() and factory.take(n)', () => {
    const Schema = z.number();
    const f = initGenerator().factory(Schema);
    expect(typeof f.next()).toBe('number');
    expect(f.take(3)).toHaveLength(3);
  });

  it('generateMany items vary across calls (with same seed deterministic)', () => {
    const Schema = z.number().min(0).max(1_000_000);
    const a = initGenerator({ seed: 7 }).generateMany(Schema, 5);
    const b = initGenerator({ seed: 7 }).generateMany(Schema, 5);
    expect(a).toEqual(b);
    // and items inside are typically distinct (probabilistically)
    expect(new Set(a).size).toBeGreaterThan(1);
  });
});

describe('supplyPath - through wrappers', () => {
  it('matches through z.optional()', () => {
    const Schema = z.object({ name: z.string().optional() });
    // optionalProbability=0 ensures the inner is generated; supplyPath
    // should still apply (and overrides the inner).
    const result = initGenerator({ optionalProbability: 0 })
      .supplyPath(['name'], 'Alice')
      .generate(Schema);
    expect(result.name).toBe('Alice');
  });

  it('matches through z.nullable()', () => {
    const Schema = z.object({ name: z.string().nullable() });
    const result = initGenerator({ nullableProbability: 0 })
      .supplyPath(['name'], 'Alice')
      .generate(Schema);
    expect(result.name).toBe('Alice');
  });

  it('matches through z.default()', () => {
    const Schema = z.object({ name: z.string().default('def') });
    const result = initGenerator({ defaultProbability: 0 })
      .supplyPath(['name'], 'Alice')
      .generate(Schema);
    expect(result.name).toBe('Alice');
  });

  it('matches through z.lazy()', () => {
    const Inner = z.lazy(() => z.string());
    const Schema = z.object({ name: Inner });
    const result = initGenerator()
      .supplyPath(['name'], 'Alice')
      .generate(Schema);
    expect(result.name).toBe('Alice');
  });
});

describe('supplyPath - inside union', () => {
  it('matches the same path regardless of which union branch is picked', () => {
    const A = z.object({ kind: z.literal('a'), value: z.string() });
    const B = z.object({ kind: z.literal('b'), value: z.string() });
    const Schema = z.object({ payload: z.union([A, B]) });
    // Run several times: regardless of branch, payload.value should be pinned.
    for (let i = 0; i < 5; i++) {
      const result = initGenerator({ seed: i + 1 })
        .supplyPath(['payload', 'value'], 'PINNED')
        .generate(Schema);
      expect(result.payload.value).toBe('PINNED');
    }
  });
});

describe('supplyPath - record/map with non-string key types', () => {
  it('record with z.enum() key — only matching members are accepted', () => {
    const Schema = z.record(z.enum(['admin', 'user']), z.number());
    const result = initGenerator({ record: { min: 0, max: 0 } })
      .supplyPath(['admin'], 999)
      .supplyPath(['superuser'], 1) // not in enum -> ignored
      .generate(Schema);
    expect(result['admin']).toBe(999);
    expect('superuser' in result).toBe(false);
  });

  it('map with z.literal key — literal value matches', () => {
    const Schema = z.map(z.literal('only-key'), z.number());
    const result = initGenerator({ map: { min: 0, max: 0 } })
      .supplyPath(['only-key'], 42)
      .generate(Schema);
    expect(result.get('only-key')).toBe(42);
  });
});

describe('supplyPath - empty value', () => {
  it('can supply undefined explicitly', () => {
    const Schema = z.object({ x: z.string().optional() });
    const result = initGenerator()
      .supplyPath(['x'], undefined)
      .generate(Schema);
    expect(result.x).toBeUndefined();
  });

  it('can supply null at a nullable slot', () => {
    const Schema = z.object({ x: z.string().nullable() });
    const result = initGenerator()
      .supplyPath(['x'], null)
      .generate(Schema);
    expect(result.x).toBeNull();
  });
});

describe('z.custom inside containers', () => {
  it('omitted z.custom is dropped from arrays', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const Schema = z.array(z.custom<File>((v) => v instanceof File));
    const result = initGenerator({ array: { min: 3, max: 3 } }).generate(
      Schema,
    );
    // every entry is OMIT → array becomes empty
    expect(result).toEqual([]);
    warn.mockRestore();
  });

  it('omitted z.custom triggers a tuple warning (preflight disabled)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const Schema = z.tuple([z.string(), z.custom<File>((v) => v instanceof File)]);
    // preflight would reject this upfront — disable it to exercise the
    // runtime tuple warning path.
    initGenerator({ preflightCheck: false }).generate(Schema);
    const tupleWarn = warn.mock.calls.find((args) =>
      String(args[0]).includes('OMIT_SYMBOL found in tuple'),
    );
    expect(tupleWarn).toBeDefined();
    warn.mockRestore();
  });

  it('omitted z.custom is dropped from a set', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const Schema = z.set(z.custom<File>((v) => v instanceof File));
    const result = initGenerator({ set: { min: 3, max: 3 } }).generate(Schema);
    expect(result.size).toBe(0);
    warn.mockRestore();
  });

  it('bare z.custom without a mock returns undefined at the top level', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // top-level (not inside a tuple) — preflight does not flag it; the
    // generate() guard converts the internal OMIT sentinel to undefined.
    const result = initGenerator().generate(
      z.custom<File>((v) => v instanceof File),
    );
    expect(result).toBeUndefined();
    warn.mockRestore();
  });

  it('meta.mock function receives a faker instance and is seed-deterministic', () => {
    const Schema = z.custom<string>((v) => typeof v === 'string').meta({
      mock: (faker: { number: { int: (opts: { min: number; max: number }) => number } }) =>
        `id-${faker.number.int({ min: 0, max: 1_000_000 })}`,
    });
    const a = initGenerator({ seed: 11 }).generate(Schema);
    const b = initGenerator({ seed: 11 }).generate(Schema);
    expect(a).toBe(b);
    expect(a).toMatch(/^id-\d+$/);
  });
});

describe('factory - determinism', () => {
  it('same seed produces the same sequence across factory calls', () => {
    const Schema = z.number().min(0).max(1_000_000);
    const f1 = initGenerator({ seed: 99 }).factory(Schema);
    const f2 = initGenerator({ seed: 99 }).factory(Schema);
    const a = [f1.next(), f1.next(), f1.next()];
    const b = [f2.next(), f2.next(), f2.next()];
    expect(a).toEqual(b);
  });
});

describe('generateMany - input validation', () => {
  it('throws on a non-integer count', () => {
    expect(() => initGenerator().generateMany(z.string(), 2.5)).toThrow();
  });

  it('throws on NaN / Infinity', () => {
    expect(() => initGenerator().generateMany(z.string(), NaN)).toThrow();
    expect(() =>
      initGenerator().generateMany(z.string(), Infinity),
    ).toThrow();
  });
});

describe('supplyPath - array index hard limit', () => {
  it('throws when a supplied index exceeds the hard limit', () => {
    expect(() =>
      initGenerator()
        .supplyPath([20_000], 'x')
        .generate(z.array(z.string())),
    ).toThrow(/hard limit/);
  });

  it('allows an index within the limit', () => {
    const result = initGenerator()
      .supplyPath([50], 'x')
      .generate(z.array(z.string()));
    expect(result[50]).toBe('x');
  });
});

describe('supply (constructor-based)', () => {
  it('sets a fixed value for all schemas of a Zod type', () => {
    const Schema = z.object({ a: z.string(), b: z.string(), n: z.number() });
    const result = initGenerator().supply(z.ZodString, 'FIXED').generate(Schema);
    expect(result.a).toBe('FIXED');
    expect(result.b).toBe('FIXED');
    expect(typeof result.n).toBe('number');
  });

  it('targets a specific format type (z.ZodEmail)', () => {
    const Schema = z.object({ email: z.email(), name: z.string() });
    const result = initGenerator()
      .supply(z.ZodEmail, 'fixed@example.com')
      .generate(Schema);
    expect(result.email).toBe('fixed@example.com');
    expect(result.name).not.toBe('fixed@example.com');
  });

  it('first registration wins on conflict', () => {
    const result = initGenerator()
      .supply(z.ZodString, 'first')
      .supply(z.ZodString, 'second')
      .generate(z.string());
    expect(result).toBe('first');
  });

  it('supply registered before override takes priority', () => {
    const result = initGenerator()
      .supply(z.ZodString, 'from-supply')
      .override((schema) => (schema instanceof z.ZodString ? 'from-override' : undefined))
      .generate(z.string());
    expect(result).toBe('from-supply');
  });
});

describe('updateConfig', () => {
  it('applies the new config', () => {
    const gen = initGenerator({ array: { min: 1, max: 1 } });
    gen.updateConfig({ array: { min: 5, max: 5 } });
    expect(gen.generate(z.array(z.string()))).toHaveLength(5);
  });

  it('preserves supplyPath registrations across a config change', () => {
    const Schema = z.object({ name: z.string() });
    const gen = initGenerator().supplyPath(['name'], 'PINNED');
    gen.updateConfig({ seed: 999 });
    expect(gen.generate(Schema).name).toBe('PINNED');
  });

  it('preserves supplyRef registrations across a config change', () => {
    const Name = z.string();
    const gen = initGenerator().supplyRef(Name, 'PINNED');
    gen.updateConfig({ seed: 999 });
    expect(gen.generate(z.object({ name: Name })).name).toBe('PINNED');
  });

  it('preserves supply / override across a config change', () => {
    const gen = initGenerator().supply(z.ZodString, 'KEPT');
    gen.updateConfig({ seed: 999 });
    expect(gen.generate(z.string())).toBe('KEPT');
  });

  it('preserves the opaque-customizer flag (preflight still downgrades)', () => {
    // an override is opaque -> preflight downgrades the tuple-custom error
    // to a warning. updateConfig must keep that flag, or this would throw.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const Schema = z.tuple([
      z.string(),
      z.custom<File>((v) => v instanceof File),
    ]);
    const gen = initGenerator().override(() => undefined);
    gen.updateConfig({ seed: 2 });
    expect(() => gen.generate(Schema)).not.toThrow();
    warn.mockRestore();
  });
});
