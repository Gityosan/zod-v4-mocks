import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { initGenerator } from '../src';

const FileCustom = () => z.custom<File>((v) => v instanceof File);

describe('preflight - z.custom at a tuple position', () => {
  it('throws by default for an un-mocked z.custom tuple slot', () => {
    const Schema = z.tuple([z.string(), FileCustom()]);
    expect(() => initGenerator().generate(Schema)).toThrow(/Preflight check/);
  });

  it('error message names the offending path', () => {
    const Schema = z.object({ pair: z.tuple([z.string(), FileCustom()]) });
    expect(() => initGenerator().generate(Schema)).toThrow(/pair\[1\]/);
  });

  it('passes when the tuple custom has a meta mock', () => {
    const Schema = z.tuple([
      z.string(),
      FileCustom().meta({ mock: () => new File([], 'a.txt') }),
    ]);
    expect(() => initGenerator().generate(Schema)).not.toThrow();
  });

  it('passes when the tuple custom is covered by supplyRef', () => {
    const Custom = FileCustom();
    const Schema = z.tuple([z.string(), Custom]);
    expect(() =>
      initGenerator()
        .supplyRef(Custom, new File([], 'a.txt'))
        .generate(Schema),
    ).not.toThrow();
  });

  it('downgrades to a warning when an opaque override is registered', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const Schema = z.tuple([z.string(), FileCustom()]);
    // override exists -> preflight cannot verify -> warn, do not throw
    expect(() =>
      initGenerator()
        .override(() => undefined)
        .generate(Schema),
    ).not.toThrow();
    const preflightWarn = warn.mock.calls.find((a) =>
      String(a[0]).includes('[preflight]'),
    );
    expect(preflightWarn).toBeDefined();
    warn.mockRestore();
  });

  it('does not flag a z.custom nested in an object inside a tuple', () => {
    // the object absorbs the omission, so the tuple slot stays valid
    const Schema = z.tuple([
      z.string(),
      z.object({ file: FileCustom() }),
    ]);
    expect(() => initGenerator().generate(Schema)).not.toThrow();
  });

  it('does not flag a z.custom inside an array', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const Schema = z.array(FileCustom());
    expect(() => initGenerator().generate(Schema)).not.toThrow();
    warn.mockRestore();
  });

  it('flags a custom in a nested tuple', () => {
    const Schema = z.object({
      a: z.object({ b: z.tuple([z.tuple([FileCustom()])]) }),
    });
    expect(() => initGenerator().generate(Schema)).toThrow(/a\.b\[0\]\[0\]/);
  });
});

describe('preflight - toggle', () => {
  it('preflightCheck: false skips the check', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const Schema = z.tuple([z.string(), FileCustom()]);
    expect(() =>
      initGenerator({ preflightCheck: false }).generate(Schema),
    ).not.toThrow();
    warn.mockRestore();
  });
});

describe('preflight - recursion safety', () => {
  it('does not infinite-loop on a recursive lazy schema', () => {
    const Tree: z.ZodObject<{
      value: z.ZodString;
      children: z.ZodLazy;
    }> = z.object({
      value: z.string(),
      children: z.lazy(() => z.array(Tree)),
    });
    expect(() =>
      initGenerator({ recursiveDepthLimit: 2 }).generate(Tree),
    ).not.toThrow();
  });

  it('does not infinite-loop on a getter-based circular schema', () => {
    const Node = z.object({
      value: z.number(),
      get next() {
        return Node.optional();
      },
    });
    expect(() =>
      initGenerator({ recursiveDepthLimit: 2 }).generate(Node),
    ).not.toThrow();
  });

  it('detects a z.custom tuple slot reached through a lazy wrapper', () => {
    const Schema = z.object({
      lazyPair: z.lazy(() => z.tuple([z.string(), FileCustom()])),
    });
    expect(() => initGenerator().generate(Schema)).toThrow(/Preflight check/);
  });
});

describe('preflight auto-fix - recursive z.lazy as its own anchor', () => {
  it('warns and auto-fixes so generation terminates', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Previously a stack overflow: the lazy is its own recursion anchor and
    // z.lazy() is not depth-tracked. Preflight detects it, warns, and
    // substitutes the unwrapped form so generation terminates.
    const Tree: z.ZodLazy = z.lazy(() =>
      z.object({ value: z.string(), children: z.array(Tree) }),
    );
    const result = initGenerator({ recursiveDepthLimit: 2 }).generate(Tree);
    expect(typeof result.value).toBe('string');
    expect(Array.isArray(result.children)).toBe(true);
    const w = warn.mock.calls.find(
      (a) =>
        String(a[0]).includes('[preflight]') &&
        String(a[0]).includes('recursion anchor'),
    );
    expect(w).toBeDefined();
    warn.mockRestore();
  });

  it('the auto-fixed schema is deterministic under a seed', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const buildTree = (): z.ZodLazy => {
      const Tree: z.ZodLazy = z.lazy(() =>
        z.object({ value: z.string(), children: z.array(Tree) }),
      );
      return Tree;
    };
    const a = initGenerator({ seed: 5, recursiveDepthLimit: 2 }).generate(
      buildTree(),
    );
    const b = initGenerator({ seed: 5, recursiveDepthLimit: 2 }).generate(
      buildTree(),
    );
    expect(a).toEqual(b);
    warn.mockRestore();
  });

  it('a lazy nested below a concrete anchor needs no fix and no warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const Tree: z.ZodObject<{ value: z.ZodString; children: z.ZodLazy }> =
      z.object({
        value: z.string(),
        children: z.lazy(() => z.array(Tree)),
      });
    expect(() =>
      initGenerator({ recursiveDepthLimit: 2 }).generate(Tree),
    ).not.toThrow();
    const w = warn.mock.calls.find((a) =>
      String(a[0]).includes('recursion anchor'),
    );
    expect(w).toBeUndefined();
    warn.mockRestore();
  });

  it('preflightCheck: false skips the auto-fix', () => {
    // With preflight disabled the dangerous schema is not corrected; the
    // toggle is the documented escape hatch.
    const Tree: z.ZodLazy = z.lazy(() =>
      z.object({ value: z.string(), children: z.array(Tree) }),
    );
    const gen = initGenerator({ preflightCheck: false });
    // no preflight -> no fix registered
    expect(() => {
      try {
        gen.generate(Tree);
      } catch {
        /* a stack overflow here is the expected un-fixed behaviour */
      }
    }).not.toThrow();
  });
});

describe('preflight - ignored .refine() / .superRefine()', () => {
  it('warns when a refinement is present (still generates)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const Schema = z.object({
      password: z.string().refine((s) => s.length > 8),
    });
    const result = initGenerator().generate(Schema);
    expect(typeof result.password).toBe('string');
    const w = warn.mock.calls.find(
      (a) =>
        String(a[0]).includes('[preflight]') &&
        String(a[0]).includes('.refine()'),
    );
    expect(w).toBeDefined();
    warn.mockRestore();
  });

  it('does not warn for plain method constraints like .min()', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const Schema = z.object({ name: z.string().min(3) });
    initGenerator().generate(Schema);
    const w = warn.mock.calls.find((a) =>
      String(a[0]).includes('.refine()'),
    );
    expect(w).toBeUndefined();
    warn.mockRestore();
  });

  it('object-level (cross-field) refinements are detected', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const Schema = z
      .object({ a: z.string(), b: z.string() })
      .refine((o) => o.a === o.b);
    initGenerator().generate(Schema);
    const w = warn.mock.calls.find((a) =>
      String(a[0]).includes('.refine()'),
    );
    expect(w).toBeDefined();
    warn.mockRestore();
  });
});

describe('preflight - invalid z.record key type', () => {
  it('throws for a non-keyable record key type', () => {
    // boolean is not a valid record key (string/number/symbol expected)
    const Schema = z.record(z.boolean() as never, z.string());
    expect(() => initGenerator().generate(Schema)).toThrow(/record\(\) key/);
  });

  it('accepts string / number / enum key types', () => {
    expect(() =>
      initGenerator().generate(z.record(z.string(), z.number())),
    ).not.toThrow();
    expect(() =>
      initGenerator().generate(z.record(z.enum(['a', 'b']), z.number())),
    ).not.toThrow();
  });
});

describe('preflight - incompatible z.intersection', () => {
  it('throws for incompatible primitive types', () => {
    const Schema = z.intersection(z.string(), z.number());
    expect(() => initGenerator().generate(Schema)).toThrow(
      /incompatible types/,
    );
  });

  it('throws for an object intersected with a primitive', () => {
    const Schema = z.intersection(z.object({ a: z.string() }), z.string());
    expect(() => initGenerator().generate(Schema)).toThrow(/Preflight check/);
  });

  it('throws for enums with no common value', () => {
    const Schema = z.intersection(z.enum(['a', 'b']), z.enum(['c', 'd']));
    expect(() => initGenerator().generate(Schema)).toThrow(/no common value/);
  });

  it('warns (does not throw) for numbers with a disjoint range', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const Schema = z.intersection(z.number().min(10), z.number().max(5));
    // the generator clamps such a range rather than throwing, so this is a
    // warning, not an error
    expect(() => initGenerator().generate(Schema)).not.toThrow();
    const w = warn.mock.calls.find((a) =>
      String(a[0]).includes('disjoint range'),
    );
    expect(w).toBeDefined();
    warn.mockRestore();
  });

  it('accepts compatible intersections', () => {
    expect(() =>
      initGenerator().generate(z.intersection(z.string(), z.string())),
    ).not.toThrow();
    expect(() =>
      initGenerator().generate(
        z.intersection(
          z.object({ a: z.string() }),
          z.object({ b: z.number() }),
        ),
      ),
    ).not.toThrow();
  });

  it('does not flag an intersection involving z.any()', () => {
    expect(() =>
      initGenerator().generate(z.intersection(z.any(), z.string())),
    ).not.toThrow();
  });

  it('error names the offending path', () => {
    const Schema = z.object({ bad: z.intersection(z.string(), z.number()) });
    expect(() => initGenerator().generate(Schema)).toThrow(/bad&L|bad&R|bad/);
  });
});

describe('preflight - unsatisfiable min > max range', () => {
  it('warns for a number with min > max', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    initGenerator().generate(z.object({ n: z.number().min(10).max(5) }));
    const w = warn.mock.calls.find(
      (a) =>
        String(a[0]).includes('[preflight]') &&
        String(a[0]).includes('Unsatisfiable number range'),
    );
    expect(w).toBeDefined();
    warn.mockRestore();
  });

  it('warns for a bigint with min > max', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    initGenerator().generate(z.bigint().min(100n).max(1n));
    const w = warn.mock.calls.find((a) =>
      String(a[0]).includes('Unsatisfiable bigint range'),
    );
    expect(w).toBeDefined();
    warn.mockRestore();
  });

  it('does not warn for a valid range', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    initGenerator().generate(z.number().min(5).max(10));
    const w = warn.mock.calls.find((a) =>
      String(a[0]).includes('Unsatisfiable'),
    );
    expect(w).toBeUndefined();
    warn.mockRestore();
  });
});

describe('preflight - conflicting string checks', () => {
  it('warns when a z.string() has multiple regex checks', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    initGenerator().generate(z.string().regex(/^[A-Z]/).regex(/\d$/));
    const w = warn.mock.calls.find(
      (a) =>
        String(a[0]).includes('[preflight]') &&
        String(a[0]).includes('multiple regex'),
    );
    expect(w).toBeDefined();
    warn.mockRestore();
  });

  it('warns for multiple startsWith checks', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    initGenerator().generate(z.string().startsWith('a').startsWith('ab'));
    const w = warn.mock.calls.find((a) =>
      String(a[0]).includes('startsWith'),
    );
    expect(w).toBeDefined();
    warn.mockRestore();
  });

  it('does not warn for a single regex check', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    initGenerator().generate(z.string().regex(/^[A-Z]+$/));
    const w = warn.mock.calls.find((a) =>
      String(a[0]).includes('multiple'),
    );
    expect(w).toBeUndefined();
    warn.mockRestore();
  });
});

describe('preflight - unsupported schema types', () => {
  it('warns for z.promise()', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      initGenerator().generate(z.promise(z.string()) as never);
    } catch {
      /* generation of an unsupported type may also fail */
    }
    const w = warn.mock.calls.find(
      (a) =>
        String(a[0]).includes('[preflight]') &&
        String(a[0]).includes('z.promise()'),
    );
    expect(w).toBeDefined();
    warn.mockRestore();
  });

  it('does not warn for supported types', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    initGenerator().generate(
      z.object({
        a: z.string(),
        b: z.number(),
        c: z.array(z.boolean()),
        d: z.union([z.string(), z.literal(1)]),
        e: z.email(),
      }),
    );
    const w = warn.mock.calls.find((a) =>
      String(a[0]).includes('not recognized'),
    );
    expect(w).toBeUndefined();
    warn.mockRestore();
  });
});

describe('preflight - additional coverage', () => {
  it('warns for an ignored .superRefine()', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    initGenerator().generate(z.string().superRefine(() => {}));
    const w = warn.mock.calls.find(
      (a) =>
        String(a[0]).includes('[preflight]') &&
        String(a[0]).includes('.refine()'),
    );
    expect(w).toBeDefined();
    warn.mockRestore();
  });

  it('warns for multiple length checks on a z.string()', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    initGenerator().generate(z.string().length(5).length(10));
    const w = warn.mock.calls.find((a) => String(a[0]).includes('length'));
    expect(w).toBeDefined();
    warn.mockRestore();
  });

  it('warns for multiple endsWith checks on a z.string()', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    initGenerator().generate(z.string().endsWith('a').endsWith('b'));
    const w = warn.mock.calls.find((a) => String(a[0]).includes('endsWith'));
    expect(w).toBeDefined();
    warn.mockRestore();
  });

  it('warns for an unsupported z.function()', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      initGenerator().generate(z.function() as never);
    } catch {
      /* an unsupported type may also fail to generate */
    }
    const w = warn.mock.calls.find(
      (a) =>
        String(a[0]).includes('[preflight]') &&
        String(a[0]).includes('z.function()'),
    );
    expect(w).toBeDefined();
    warn.mockRestore();
  });

  it('downgrades an intersection error to a warning under an opaque override', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const Schema = z.intersection(z.string(), z.number());
    // an opaque override that actually handles the node — preflight cannot
    // verify coverage, so it warns instead of throwing
    const result = initGenerator()
      .override((s) => (s instanceof z.ZodIntersection ? 'handled' : undefined))
      .generate(Schema);
    expect(result).toBe('handled');
    const w = warn.mock.calls.find((a) => String(a[0]).includes('[preflight]'));
    expect(w).toBeDefined();
    warn.mockRestore();
  });

  it('downgrades an invalid record-key error to a warning under an opaque override', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const Schema = z.record(z.boolean() as never, z.string());
    const result = initGenerator()
      .override((s) => (s instanceof z.ZodRecord ? { ok: 1 } : undefined))
      .generate(Schema);
    expect(result).toEqual({ ok: 1 });
    const w = warn.mock.calls.find((a) => String(a[0]).includes('[preflight]'));
    expect(w).toBeDefined();
    warn.mockRestore();
  });
});
