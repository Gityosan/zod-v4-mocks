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

describe('recursive z.lazy as its own anchor', () => {
  it('generates (terminates) when the lazy itself is the recursion anchor', () => {
    // Previously a stack overflow: the depth limiter tracked object/array
    // references but not z.lazy(). z.lazy() is now depth-tracked, so this
    // form generates and terminates at the recursion limit.
    const Tree: z.ZodLazy = z.lazy(() =>
      z.object({ value: z.string(), children: z.array(Tree) }),
    );
    const result = initGenerator({ recursiveDepthLimit: 2 }).generate(Tree);
    expect(typeof result.value).toBe('string');
    expect(Array.isArray(result.children)).toBe(true);
  });

  it('top-level recursive lazy is deterministic under a seed', () => {
    const Tree: z.ZodLazy = z.lazy(() =>
      z.object({ value: z.string(), children: z.array(Tree) }),
    );
    const a = initGenerator({ seed: 5, recursiveDepthLimit: 2 }).generate(Tree);
    const b = initGenerator({ seed: 5, recursiveDepthLimit: 2 }).generate(Tree);
    expect(a).toEqual(b);
  });
});
