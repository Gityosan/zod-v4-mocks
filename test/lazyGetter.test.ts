import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { initGenerator } from '../src';

/**
 * When circular references hit the depth limit, empty objects `{}` are returned
 * as terminators. These won't pass strict `parse()` validation since required
 * fields are missing. Tests use structural assertions instead.
 */

function hasShape(obj: unknown, key: string): boolean {
  return typeof obj === 'object' && obj !== null && key in obj;
}

describe('Lazy and Getter recursive schemas', () => {
  describe('z.lazy() self-reference', () => {
    const Category: z.ZodObject<{
      name: z.ZodString;
      subcategories: z.ZodLazy;
    }> = z.object({
      name: z.string(),
      subcategories: z.lazy(() => z.array(Category)),
    });

    it('generates mock data with correct structure', () => {
      const gen = initGenerator({ seed: 1 });
      const result = gen.generate(Category);
      expect(typeof result.name).toBe('string');
      expect(Array.isArray(result.subcategories)).toBe(true);
    });

    it('respects lazyDepthLimit', () => {
      const gen = initGenerator({ seed: 1, lazyDepthLimit: 2 });
      const result = gen.generate(Category);
      expect(typeof result.name).toBe('string');
      expect(Array.isArray(result.subcategories)).toBe(true);
    });

    it('determinism (same seed => same output)', () => {
      const g1 = initGenerator({ seed: 42 });
      const g2 = initGenerator({ seed: 42 });
      expect(g1.generate(Category)).toEqual(g2.generate(Category));
    });
  });

  describe('getter self-reference', () => {
    const Category = z.object({
      name: z.string(),
      get subcategories() {
        return z.array(Category);
      },
    });

    it('generates mock data with correct structure', () => {
      const gen = initGenerator({ seed: 1 });
      const result = gen.generate(Category);
      expect(typeof result.name).toBe('string');
      expect(Array.isArray(result.subcategories)).toBe(true);
    });

    it('respects lazyDepthLimit', () => {
      const gen = initGenerator({ seed: 1, lazyDepthLimit: 2 });
      const result = gen.generate(Category);
      expect(typeof result.name).toBe('string');
      expect(Array.isArray(result.subcategories)).toBe(true);
    });

    it('determinism (same seed => same output)', () => {
      const g1 = initGenerator({ seed: 42 });
      const g2 = initGenerator({ seed: 42 });
      expect(g1.generate(Category)).toEqual(g2.generate(Category));
    });
  });

  describe('getter wrapping lazy', () => {
    const Tree = z.object({
      value: z.string(),
      get children() {
        return z.lazy(() => z.array(Tree));
      },
    });

    it('generates mock data with correct structure', () => {
      const gen = initGenerator({ seed: 1 });
      const result = gen.generate(Tree);
      expect(typeof result.value).toBe('string');
      expect(Array.isArray(result.children)).toBe(true);
    });

    it('respects lazyDepthLimit', () => {
      const gen = initGenerator({ seed: 1, lazyDepthLimit: 2 });
      const result = gen.generate(Tree);
      expect(typeof result.value).toBe('string');
      expect(Array.isArray(result.children)).toBe(true);
    });
  });

  describe('depth consistency across patterns', () => {
    function countLevels(
      obj: Record<string, unknown>,
      childKey: string,
      level = 0,
    ): number {
      if (!obj || typeof obj !== 'object') return level;
      const children = obj[childKey];
      if (!Array.isArray(children) || children.length === 0) return level + 1;
      return Math.max(
        ...children.map((c: Record<string, unknown>): number =>
          countLevels(c, childKey, level + 1),
        ),
      );
    }

    it('lazy and getter produce same depth', () => {
      const LazyTree: z.ZodObject<{
        value: z.ZodString;
        children: z.ZodLazy;
      }> = z.object({
        value: z.string(),
        children: z.lazy(() => z.array(LazyTree)),
      });
      const GetterTree = z.object({
        value: z.string(),
        get children() {
          return z.array(GetterTree);
        },
      });

      for (const limit of [3, 5, 7]) {
        const gen = initGenerator({ seed: 1, lazyDepthLimit: limit });
        const lazyDepth = countLevels(gen.generate(LazyTree), 'children');
        const getterDepth = countLevels(gen.generate(GetterTree), 'children');
        expect(lazyDepth).toBe(getterDepth);
      }
    });
  });

  describe('mutual recursion with getter', () => {
    const User: z.ZodType<{
      email: string;
      posts: { title: string; author: unknown }[];
    }> = z.object({
      email: z.email(),
      get posts() {
        return z.array(Post);
      },
    });

    const Post: z.ZodType<{
      title: string;
      author: { email: string; posts: unknown[] };
    }> = z.object({
      title: z.string(),
      get author() {
        return User;
      },
    });

    it('generates mock data from User with correct structure', () => {
      const gen = initGenerator({ seed: 1 });
      const result = gen.generate(User);
      expect(typeof result.email).toBe('string');
      expect(Array.isArray(result.posts)).toBe(true);
    });

    it('generates mock data from Post with correct structure', () => {
      const gen = initGenerator({ seed: 1 });
      const result = gen.generate(Post);
      expect(typeof result.title).toBe('string');
      expect(hasShape(result.author, 'email')).toBe(true);
    });

    it('terminates with small lazyDepthLimit', () => {
      const gen = initGenerator({ seed: 1, lazyDepthLimit: 2 });
      const result = gen.generate(User);
      expect(typeof result.email).toBe('string');
      expect(Array.isArray(result.posts)).toBe(true);
    });
  });

  describe('mutual recursion with lazy', () => {
    const A: z.ZodObject<{ name: z.ZodString; b: z.ZodLazy }> = z.object({
      name: z.string(),
      b: z.lazy(() => B),
    });
    const B: z.ZodObject<{ name: z.ZodString; a: z.ZodLazy }> = z.object({
      name: z.string(),
      a: z.lazy(() => A),
    });

    it('generates mock data with correct structure', () => {
      const gen = initGenerator({ seed: 1 });
      const result = gen.generate(A);
      expect(typeof result.name).toBe('string');
      expect(hasShape(result.b, 'name')).toBe(true);
    });

    it('terminates with small lazyDepthLimit', () => {
      const gen = initGenerator({ seed: 1, lazyDepthLimit: 2 });
      const result = gen.generate(A);
      expect(typeof result.name).toBe('string');
    });
  });

  describe('linked list (optional self-reference)', () => {
    const Node = z.object({
      value: z.number(),
      get next() {
        return Node.optional();
      },
    });

    it('generates valid mock data', () => {
      const gen = initGenerator({ seed: 1 });
      const result = gen.generate(Node);
      expect(() => Node.parse(result)).not.toThrow();
    });
  });

  describe('nullable array self-reference', () => {
    const Activity = z.object({
      name: z.string(),
      get subactivities(): z.ZodNullable<z.ZodArray<typeof Activity>> {
        return z.nullable(z.array(Activity));
      },
    });

    it('generates mock data with correct structure', () => {
      const gen = initGenerator({ seed: 1 });
      const result = gen.generate(Activity);
      expect(typeof result.name).toBe('string');
      expect(
        result.subactivities === null || Array.isArray(result.subactivities),
      ).toBe(true);
    });
  });

  describe('direct Map self-reference', () => {
    const RecMap: z.ZodMap = z.map(
      z.string(),
      z.lazy(() => RecMap),
    );

    it('terminates without stack overflow', () => {
      const gen = initGenerator({ seed: 1, recursiveDepthLimit: 3 });
      const result = gen.generate(RecMap);
      expect(result).toBeInstanceOf(Map);
    });

    it('determinism (same seed => same output)', () => {
      const g1 = initGenerator({ seed: 42, recursiveDepthLimit: 3 });
      const g2 = initGenerator({ seed: 42, recursiveDepthLimit: 3 });
      expect(g1.generate(RecMap)).toEqual(g2.generate(RecMap));
    });
  });

  describe('direct Set self-reference', () => {
    const RecSet: z.ZodSet = z.set(z.lazy(() => RecSet));

    it('terminates without stack overflow', () => {
      const gen = initGenerator({ seed: 1, recursiveDepthLimit: 3 });
      const result = gen.generate(RecSet);
      expect(result).toBeInstanceOf(Set);
    });

    it('determinism (same seed => same output)', () => {
      const g1 = initGenerator({ seed: 42, recursiveDepthLimit: 3 });
      const g2 = initGenerator({ seed: 42, recursiveDepthLimit: 3 });
      expect(g1.generate(RecSet)).toEqual(g2.generate(RecSet));
    });
  });

  describe('Map value referencing object (getter)', () => {
    const MapNode = z.object({
      name: z.string(),
      get data() {
        return z.map(z.string(), MapNode);
      },
    });

    it('generates mock data with correct structure', () => {
      const gen = initGenerator({ seed: 1, recursiveDepthLimit: 3 });
      const result = gen.generate(MapNode);
      expect(typeof result.name).toBe('string');
      expect(result.data).toBeInstanceOf(Map);
    });
  });

  describe('Set element referencing object (getter)', () => {
    const SetNode = z.object({
      name: z.string(),
      get items() {
        return z.set(SetNode);
      },
    });

    it('generates mock data with correct structure', () => {
      const gen = initGenerator({ seed: 1, recursiveDepthLimit: 3 });
      const result = gen.generate(SetNode);
      expect(typeof result.name).toBe('string');
      expect(result.items).toBeInstanceOf(Set);
    });
  });

  describe('Tuple element referencing object (getter)', () => {
    const TupleNode = z.object({
      value: z.string(),
      get pair() {
        return z.tuple([z.string(), TupleNode]);
      },
    });

    it('generates mock data with correct structure', () => {
      const gen = initGenerator({ seed: 1, recursiveDepthLimit: 3 });
      const result = gen.generate(TupleNode);
      expect(typeof result.value).toBe('string');
      expect(Array.isArray(result.pair)).toBe(true);
    });
  });

  describe('recursiveDepthLimit config', () => {
    const Tree = z.object({
      value: z.string(),
      get children() {
        return z.array(Tree);
      },
    });

    it('recursiveDepthLimit takes priority over lazyDepthLimit', () => {
      const gen = initGenerator({
        seed: 1,
        lazyDepthLimit: 10,
        recursiveDepthLimit: 2,
      });
      const result = gen.generate(Tree);
      expect(typeof result.value).toBe('string');
      // With recursiveDepthLimit=2, depth should be shallow
      const children = result.children;
      expect(Array.isArray(children)).toBe(true);
      for (const child of children) {
        // Children at limit should be empty objects
        expect(Object.keys(child).length).toBe(0);
      }
    });

    it('falls back to lazyDepthLimit when recursiveDepthLimit is not set', () => {
      const gen = initGenerator({ seed: 1, lazyDepthLimit: 2 });
      const result = gen.generate(Tree);
      const children = result.children;
      expect(Array.isArray(children)).toBe(true);
      for (const child of children) {
        expect(Object.keys(child).length).toBe(0);
      }
    });
  });
});
