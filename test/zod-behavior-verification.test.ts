import { describe, expect, it } from 'vitest';
import { z } from 'zod';

/**
 * Zodの実際の動作を検証するテスト
 * mock生成とは無関係に、Zodがどのように文字列をバリデートするかを確認
 */
describe('Zod String Behavior Verification', () => {
  describe('Multiple checks of same type', () => {
    it('multiple regex - all must match (AND condition)', () => {
      const schema = z
        .string()
        .regex(/^[A-Z]/)
        .regex(/\d$/);

      expect(schema.safeParse('A123').success).toBe(true);
      expect(schema.safeParse('Test9').success).toBe(true);
      expect(schema.safeParse('ABC').success).toBe(false);
      expect(schema.safeParse('abc9').success).toBe(false);
    });

    it('multiple includes - all must be present (AND condition)', () => {
      const schema = z.string().includes('AAA').includes('BBB');

      expect(schema.safeParse('AAABBB').success).toBe(true);
      expect(schema.safeParse('BBBAAAA').success).toBe(true);
      expect(schema.safeParse('xyzAAAdefBBBghi').success).toBe(true);
      expect(schema.safeParse('AAA').success).toBe(false);
      expect(schema.safeParse('BBB').success).toBe(false);
    });

    it('multiple startsWith - last one wins (overwrite)', () => {
      const schema = z.string().startsWith('A').startsWith('AB');

      expect(schema.safeParse('ABC').success).toBe(true);
      expect(schema.safeParse('AXC').success).toBe(false);
    });

    it('multiple endsWith - last one wins (overwrite)', () => {
      const schema = z.string().endsWith('X').endsWith('YX');

      expect(schema.safeParse('ABYX').success).toBe(true);
      expect(schema.safeParse('ABX').success).toBe(false);
    });
  });

  describe('Order of transformations and checks', () => {
    it('toUpperCase() then startsWith() - checks after transformation', () => {
      const schema = z.string().toUpperCase().startsWith('PREFIX');

      expect(schema.safeParse('prefixTest').success).toBe(true);
      expect(schema.safeParse('PREFIXTest').success).toBe(true);
      expect(schema.safeParse('testPrefix').success).toBe(false);
    });

    it('startsWith() then toUpperCase() - checks before transformation', () => {
      const schema = z.string().startsWith('prefix').toUpperCase();

      expect(schema.safeParse('prefixTest').success).toBe(true);
      expect(schema.safeParse('PREFIXTest').success).toBe(false);
    });

    it('regex then toUpperCase - regex checks before transformation', () => {
      const schema = z
        .string()
        .regex(/^[a-z]+$/)
        .toUpperCase();

      expect(schema.safeParse('test').success).toBe(true);
      expect(schema.safeParse('Test').success).toBe(false);
    });

    it('toUpperCase then regex - regex checks after transformation', () => {
      const schema = z
        .string()
        .toUpperCase()
        .regex(/^[A-Z]+$/);

      expect(schema.safeParse('test').success).toBe(true);
      expect(schema.safeParse('TEST').success).toBe(true);
      expect(schema.safeParse('test123').success).toBe(false);
    });
  });

  describe('Length constraints with prefix/suffix', () => {
    it('max length with startsWith and endsWith', () => {
      const schema = z.string().max(10).startsWith('PRE').endsWith('SUF');

      expect(schema.safeParse('PRESUF').success).toBe(true);
      expect(schema.safeParse('PREXSUF').success).toBe(true);
      expect(schema.safeParse('PREXXSUF').success).toBe(true);
      expect(schema.safeParse('PREXXXSUF').success).toBe(true);
      expect(schema.safeParse('PREXXXXSUF').success).toBe(true);
      expect(schema.safeParse('PREXXXXXSUF').success).toBe(false);
    });

    it('exact length with startsWith and endsWith', () => {
      const schema = z.string().length(10).startsWith('PRE').endsWith('SUF');

      expect(schema.safeParse('PREXXXXSUF').success).toBe(true);
      expect(schema.safeParse('PREXXXSUF').success).toBe(false);
      expect(schema.safeParse('PREXXXXXSUF').success).toBe(false);
    });

    it('length with includes', () => {
      const schema = z.string().length(10).includes('TEST');

      expect(schema.safeParse('abTESTabcd').success).toBe(true);
      expect(schema.safeParse('TESTghijkl').success).toBe(true);
      expect(schema.safeParse('TESTghijklm').success).toBe(false);
      expect(schema.safeParse('abcdefghij').success).toBe(false);
    });

    it('overlapping startsWith and endsWith with exact length', () => {
      const schema = z.string().length(4).startsWith('TEST').endsWith('TEST');

      expect(schema.safeParse('TEST').success).toBe(true);
      expect(schema.safeParse('TESTTEST').success).toBe(false);
      expect(schema.safeParse('TES').success).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('empty string with length(0)', () => {
      const schema = z.string().length(0);

      expect(schema.safeParse('').success).toBe(true);
      expect(schema.safeParse('a').success).toBe(false);
    });

    it('startsWith empty string', () => {
      const schema = z.string().startsWith('');

      expect(schema.safeParse('').success).toBe(true);
      expect(schema.safeParse('test').success).toBe(true);
    });

    it('includes with startsWith order matters', () => {
      const schema1 = z.string().startsWith('A').includes('B');
      const schema2 = z.string().includes('B').startsWith('A');

      expect(schema1.safeParse('AB').success).toBe(true);
      expect(schema2.safeParse('AB').success).toBe(true);
      expect(schema1.safeParse('AXBX').success).toBe(true);
      expect(schema2.safeParse('AXBX').success).toBe(true);
    });
  });

  describe('Complex combinations', () => {
    it('multiple includes with startsWith and endsWith', () => {
      const schema = z
        .string()
        .startsWith('START')
        .endsWith('END')
        .includes('AAA')
        .includes('BBB');

      expect(schema.safeParse('STARTAAABBBEND').success).toBe(true);
      expect(schema.safeParse('STARTBBBAAAEND').success).toBe(true);
      expect(schema.safeParse('STARTAAAEND').success).toBe(false);
      expect(schema.safeParse('STARTBBBEND').success).toBe(false);
    });

    it('trim with other checks', () => {
      const schema = z.string().trim().min(5);

      expect(schema.safeParse('  test  ').success).toBe(false);
      expect(schema.safeParse('  tests  ').success).toBe(true);
    });

    it('toLowerCase with startsWith', () => {
      const schema = z.string().toLowerCase().startsWith('test');

      expect(schema.safeParse('TestCase').success).toBe(true);
      expect(schema.safeParse('TESTCASE').success).toBe(true);
      expect(schema.safeParse('Case').success).toBe(false);
    });
  });
});
