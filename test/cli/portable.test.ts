import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { initGenerator } from '../../src';

describe('serializePortable / deserializePortable (seroval, cross-runtime)', () => {
  it('round-trips primitives, Date, BigInt, Map, Set, RegExp, undefined, NaN/Infinity', () => {
    const generator = initGenerator();
    const data = {
      str: 'hello',
      num: 42,
      bool: true,
      und: undefined,
      nan: NaN,
      inf: Infinity,
      ninf: -Infinity,
      bi: 123456789012345678901234567890n,
      d: new Date('2025-01-01T00:00:00.000Z'),
      m: new Map<string, unknown>([
        ['a', 1],
        ['b', new Date(0)],
      ]),
      s: new Set([1, 2, 3]),
      re: /abc/gi,
      bytes: new Uint8Array([1, 2, 3, 4]),
    };

    const str = generator.serializePortable(data);
    expect(typeof str).toBe('string');

    const restored = generator.deserializePortable<typeof data>(str);
    expect(restored.str).toBe('hello');
    expect(restored.num).toBe(42);
    expect(restored.bool).toBe(true);
    expect(restored.und).toBeUndefined();
    expect(Number.isNaN(restored.nan)).toBe(true);
    expect(restored.inf).toBe(Infinity);
    expect(restored.ninf).toBe(-Infinity);
    expect(restored.bi).toBe(123456789012345678901234567890n);
    expect(restored.d).toBeInstanceOf(Date);
    expect(restored.d.toISOString()).toBe('2025-01-01T00:00:00.000Z');
    expect(restored.m).toBeInstanceOf(Map);
    expect(restored.m.get('a')).toBe(1);
    expect((restored.m.get('b') as Date).toISOString()).toBe(new Date(0).toISOString());
    expect(restored.s).toBeInstanceOf(Set);
    expect([...restored.s]).toEqual([1, 2, 3]);
    expect(restored.re).toBeInstanceOf(RegExp);
    expect(restored.re.source).toBe('abc');
    expect(restored.re.flags).toBe('gi');
    expect(restored.bytes).toBeInstanceOf(Uint8Array);
    expect(Array.from(restored.bytes)).toEqual([1, 2, 3, 4]);
  });

  it('round-trips circular references', () => {
    const generator = initGenerator();
    const a: Record<string, unknown> = { name: 'a' };
    const b: Record<string, unknown> = { name: 'b', a };
    a.b = b;

    const restored = generator.deserializePortable<typeof a>(
      generator.serializePortable(a),
    );
    expect(restored.name).toBe('a');
    expect((restored.b as typeof b).name).toBe('b');
    expect((restored.b as typeof b).a).toBe(restored);
  });

  it('round-trips a described symbol by description', () => {
    const generator = initGenerator();
    const data = { tag: Symbol('my-tag') };

    const restored = generator.deserializePortable<typeof data>(
      generator.serializePortable(data),
    );
    expect(typeof restored.tag).toBe('symbol');
    expect(restored.tag.description).toBe('my-tag');
  });

  it('round-trips a registry symbol with identity preserved', () => {
    const generator = initGenerator();
    const data = { tag: Symbol.for('zod-v4-mocks:test-key') };

    const restored = generator.deserializePortable<typeof data>(
      generator.serializePortable(data),
    );
    expect(restored.tag).toBe(Symbol.for('zod-v4-mocks:test-key'));
  });

  it('preserves shared symbol identity within one payload', () => {
    const generator = initGenerator();
    const shared = Symbol('shared');
    const data = { a: shared, b: shared, nested: { c: shared } };

    const restored = generator.deserializePortable<typeof data>(
      generator.serializePortable(data),
    );
    expect(restored.a).toBe(restored.b);
    expect(restored.a).toBe(restored.nested.c);
  });

  it('keeps distinct same-description symbols distinct', () => {
    const generator = initGenerator();
    const data = { a: Symbol('dup'), b: Symbol('dup') };

    const restored = generator.deserializePortable<typeof data>(
      generator.serializePortable(data),
    );
    expect(restored.a).not.toBe(restored.b);
    expect(restored.a.description).toBe('dup');
    expect(restored.b.description).toBe('dup');
  });

  it('round-trips symbols as Map keys and Set members', () => {
    const generator = initGenerator();
    const k = Symbol('key');
    const data = {
      map: new Map<symbol, number>([[k, 1]]),
      set: new Set<symbol>([Symbol('a'), Symbol('b')]),
    };

    const restored = generator.deserializePortable<typeof data>(
      generator.serializePortable(data),
    );
    expect(restored.map).toBeInstanceOf(Map);
    const [[mk, mv]] = [...restored.map];
    expect(typeof mk).toBe('symbol');
    expect((mk as symbol).description).toBe('key');
    expect(mv).toBe(1);
    expect(restored.set).toBeInstanceOf(Set);
    expect([...restored.set].map((s) => (s as symbol).description).sort()).toEqual(['a', 'b']);
  });

  it('round-trips a Symbol generated from z.symbol() and re-parses', () => {
    const generator = initGenerator({ seed: 123 });
    const schema = z.object({ id: z.symbol() });
    const data = generator.generate(schema);

    const restored = generator.deserializePortable<typeof data>(
      generator.serializePortable(data),
    );
    expect(typeof restored.id).toBe('symbol');
    expect((restored.id as symbol).description).toBe((data.id as symbol).description);
    expect(schema.parse(restored)).toBeDefined();
  });

  it('hints to use the async variant when sync hits a Blob', () => {
    const generator = initGenerator();
    expect(() =>
      generator.serializePortable({ blob: new Blob(['x']) }),
    ).toThrow(/serializePortableAsync/);
  });

  it('round-trips through base64 encoding (incl. multi-byte UTF-8)', () => {
    const generator = initGenerator();
    const data = { msg: 'こんにちは🎉', when: new Date('2026-05-25T00:00:00.000Z') };

    const encoded = generator.serializePortable(data, { base64: true });
    // base64 alphabet only
    expect(encoded).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);

    const restored = generator.deserializePortable<typeof data>(encoded, {
      base64: true,
    });
    expect(restored.msg).toBe('こんにちは🎉');
    expect(restored.when.toISOString()).toBe('2026-05-25T00:00:00.000Z');
  });

  it('preserves data Zod can generate that JSON would lose, and re-parses', () => {
    const generator = initGenerator({ seed: 123 });
    const schema = z.object({
      id: z.bigint(),
      tags: z.set(z.string()),
      meta: z.map(z.string(), z.number()),
      createdAt: z.date(),
    });
    const data = generator.generate(schema);

    const restored = generator.deserializePortable<typeof data>(
      generator.serializePortable(data),
    );
    expect(typeof restored.id).toBe('bigint');
    expect(restored.tags).toBeInstanceOf(Set);
    expect(restored.meta).toBeInstanceOf(Map);
    expect(restored.createdAt).toBeInstanceOf(Date);
    expect(schema.parse(restored)).toBeDefined();
  });

  it('async variant round-trips File and Blob contents', async () => {
    const generator = initGenerator();
    const data = {
      file: new File(['file-body'], 'a.txt', { type: 'text/plain' }),
      blob: new Blob(['blob-body'], { type: 'application/json' }),
    };

    const str = await generator.serializePortableAsync(data);
    const restored = generator.deserializePortable<typeof data>(str);

    expect(restored.file).toBeInstanceOf(File);
    expect(restored.file.name).toBe('a.txt');
    expect(restored.file.type).toBe('text/plain');
    expect(await restored.file.text()).toBe('file-body');
    expect(restored.blob).toBeInstanceOf(Blob);
    expect(restored.blob.type).toBe('application/json');
    expect(await restored.blob.text()).toBe('blob-body');
  });
});

describe('serializePortable — web types, async combos & symbol corners', () => {
  it('round-trips URL, URLSearchParams, and Headers', () => {
    const generator = initGenerator();
    const data = {
      url: new URL('https://example.test/path?x=1#frag'),
      params: new URLSearchParams('a=1&b=2'),
      headers: new Headers({ 'content-type': 'application/json' }),
    };

    const r = generator.deserializePortable<typeof data>(
      generator.serializePortable(data),
    );
    expect(r.url).toBeInstanceOf(URL);
    expect(r.url.href).toBe('https://example.test/path?x=1#frag');
    expect(r.params).toBeInstanceOf(URLSearchParams);
    expect(r.params.get('b')).toBe('2');
    expect(r.headers).toBeInstanceOf(Headers);
    expect(r.headers.get('content-type')).toBe('application/json');
  });

  it('async variant round-trips FormData', async () => {
    const generator = initGenerator();
    const form = new FormData();
    form.append('field', 'value');
    form.append('n', '42');

    const r = generator.deserializePortable<{ form: FormData }>(
      await generator.serializePortableAsync({ form }),
    );
    expect(r.form).toBeInstanceOf(FormData);
    expect(r.form.get('field')).toBe('value');
    expect(r.form.get('n')).toBe('42');
  });

  it('round-trips a Symbol through base64', () => {
    const generator = initGenerator();
    const encoded = generator.serializePortable({ s: Symbol('b64') }, { base64: true });
    expect(encoded).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);

    const r = generator.deserializePortable<{ s: symbol }>(encoded, { base64: true });
    expect(r.s.description).toBe('b64');
  });

  it('async variant round-trips described and registry Symbols', async () => {
    const generator = initGenerator();
    const data = { s: Symbol('async-sym'), reg: Symbol.for('zv4m:async') };

    const r = generator.deserializePortable<typeof data>(
      await generator.serializePortableAsync(data),
    );
    expect(r.s.description).toBe('async-sym');
    expect(r.reg).toBe(Symbol.for('zv4m:async'));
  });

  it('distinguishes Symbol() (no description) from Symbol("")', () => {
    const generator = initGenerator();
    const data = { none: Symbol(), empty: Symbol('') };

    const r = generator.deserializePortable<typeof data>(
      generator.serializePortable(data),
    );
    expect(r.none.description).toBeUndefined();
    expect(r.empty.description).toBe('');
  });

  it('passes well-known symbols through and boxes described ones alongside', () => {
    const generator = initGenerator();
    const data = { wk: Symbol.iterator, described: Symbol('mix') };

    const r = generator.deserializePortable<typeof data>(
      generator.serializePortable(data),
    );
    expect(r.wk).toBe(Symbol.iterator);
    expect(r.described.description).toBe('mix');
  });

  it('round-trips a top-level Symbol', () => {
    const generator = initGenerator();
    const r = generator.deserializePortable<symbol>(
      generator.serializePortable(Symbol('top')),
    );
    expect(typeof r).toBe('symbol');
    expect(r.description).toBe('top');
  });

  it('round-trips circular structures while the boxing transform is active', () => {
    const generator = initGenerator();

    // A symbol forces boxing; the cycle runs through an array.
    const arr: unknown[] = [Symbol('in-array')];
    arr.push(arr);
    const ra = generator.deserializePortable<unknown[]>(
      generator.serializePortable(arr),
    );
    expect((ra[0] as symbol).description).toBe('in-array');
    expect(ra[1]).toBe(ra);

    // …and through a Map (cycle on a value).
    const map = new Map<string, unknown>([['sym', Symbol('in-map')]]);
    map.set('self', map);
    const rm = generator.deserializePortable<Map<string, unknown>>(
      generator.serializePortable(map),
    );
    expect((rm.get('sym') as symbol).description).toBe('in-map');
    expect(rm.get('self')).toBe(rm);
  });

  it('round-trips assorted TypedArrays, ArrayBuffer, and empty collections', () => {
    const generator = initGenerator();
    const data = {
      f64: new Float64Array([1.5, -2.25]),
      i16: new Int16Array([-1, 2, 3]),
      buf: new Uint8Array([9, 8, 7]).buffer,
      emptyMap: new Map(),
      emptySet: new Set(),
    };

    const r = generator.deserializePortable<typeof data>(
      generator.serializePortable(data),
    );
    expect(Array.from(r.f64)).toEqual([1.5, -2.25]);
    expect(Array.from(r.i16)).toEqual([-1, 2, 3]);
    expect(r.buf).toBeInstanceOf(ArrayBuffer);
    expect(Array.from(new Uint8Array(r.buf))).toEqual([9, 8, 7]);
    expect(r.emptyMap.size).toBe(0);
    expect(r.emptySet.size).toBe(0);
  });

  it('does not corrupt the marker string when it appears as a value', () => {
    const generator = initGenerator();
    const data = {
      note: '$$zod-v4-mocks/symbol$$',
      list: ['$$zod-v4-mocks/symbol$$'],
    };

    const r = generator.deserializePortable<typeof data>(
      generator.serializePortable(data),
    );
    expect(r.note).toBe('$$zod-v4-mocks/symbol$$');
    expect(r.list[0]).toBe('$$zod-v4-mocks/symbol$$');
  });

  // Known limitation: symbols are boxed into a plain object keyed by an
  // internal marker. A hand-crafted object shaped exactly like that marker is
  // therefore reconstructed as a Symbol. The marker key is deliberately obscure
  // and generated mocks never produce it, so this only affects look-alike data
  // supplied by hand. Documented in the API reference. This test pins the
  // behavior so any future change is intentional.
  it('KNOWN LIMITATION: a marker-shaped plain object deserializes as a Symbol', () => {
    const generator = initGenerator();
    const lookAlike = { '$$zod-v4-mocks/symbol$$': ['desc', 'collision'] };

    const r = generator.deserializePortable(generator.serializePortable(lookAlike));
    expect(typeof r).toBe('symbol');
    expect((r as symbol).description).toBe('collision');
  });
});
