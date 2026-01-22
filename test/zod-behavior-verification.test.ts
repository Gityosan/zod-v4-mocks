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

describe('Zod Number Behavior Verification', () => {
  describe('Basic number validation', () => {
    it('z.number() accepts integers and floats', () => {
      const schema = z.number();
      expect(schema.safeParse(42).success).toBe(true);
      expect(schema.safeParse(3.14).success).toBe(true);
      expect(schema.safeParse(-10).success).toBe(true);
      expect(schema.safeParse(0).success).toBe(true);
      expect(schema.safeParse(NaN).success).toBe(false);
      expect(schema.safeParse(Infinity).success).toBe(false);
    });

    it('z.number().int() only accepts integers', () => {
      const schema = z.number().int();
      expect(schema.safeParse(42).success).toBe(true);
      expect(schema.safeParse(-10).success).toBe(true);
      expect(schema.safeParse(0).success).toBe(true);
      expect(schema.safeParse(3.14).success).toBe(false);
      expect(schema.safeParse(3.99).success).toBe(false);
    });

    it('z.number().finite() rejects infinity', () => {
      const schema = z.number().finite();
      expect(schema.safeParse(42).success).toBe(true);
      expect(schema.safeParse(3.14).success).toBe(true);
      expect(schema.safeParse(Infinity).success).toBe(false);
      expect(schema.safeParse(-Infinity).success).toBe(false);
    });
  });

  describe('Number constraints', () => {
    it('min/max constraints (inclusive)', () => {
      const schema = z.number().min(0).max(100);
      expect(schema.safeParse(0).success).toBe(true);
      expect(schema.safeParse(50).success).toBe(true);
      expect(schema.safeParse(100).success).toBe(true);
      expect(schema.safeParse(-1).success).toBe(false);
      expect(schema.safeParse(101).success).toBe(false);
    });

    it('gte/lte constraints (inclusive, aliases for min/max)', () => {
      const schema = z.number().gte(0).lte(100);
      expect(schema.safeParse(0).success).toBe(true);
      expect(schema.safeParse(50).success).toBe(true);
      expect(schema.safeParse(100).success).toBe(true);
      expect(schema.safeParse(-1).success).toBe(false);
      expect(schema.safeParse(101).success).toBe(false);
    });

    it('gt/lt constraints (exclusive)', () => {
      const schema = z.number().gt(0).lt(100);
      expect(schema.safeParse(0).success).toBe(false);
      expect(schema.safeParse(0.1).success).toBe(true);
      expect(schema.safeParse(50).success).toBe(true);
      expect(schema.safeParse(99.9).success).toBe(true);
      expect(schema.safeParse(100).success).toBe(false);
    });

    it('positive/negative/nonnegative/nonpositive', () => {
      expect(z.number().positive().safeParse(1).success).toBe(true);
      expect(z.number().positive().safeParse(0).success).toBe(false);
      expect(z.number().negative().safeParse(-1).success).toBe(true);
      expect(z.number().negative().safeParse(0).success).toBe(false);
      expect(z.number().nonnegative().safeParse(0).success).toBe(true);
      expect(z.number().nonpositive().safeParse(0).success).toBe(true);
    });

    it('multipleOf constraint', () => {
      const schema = z.number().multipleOf(5);
      expect(schema.safeParse(0).success).toBe(true);
      expect(schema.safeParse(5).success).toBe(true);
      expect(schema.safeParse(10).success).toBe(true);
      expect(schema.safeParse(3).success).toBe(false);
      expect(schema.safeParse(7).success).toBe(false);
    });

    it('multipleOf with different step value', () => {
      const schema = z.number().multipleOf(3);
      expect(schema.safeParse(0).success).toBe(true);
      expect(schema.safeParse(3).success).toBe(true);
      expect(schema.safeParse(6).success).toBe(true);
      expect(schema.safeParse(9).success).toBe(true);
      expect(schema.safeParse(1).success).toBe(false);
      expect(schema.safeParse(2).success).toBe(false);
      expect(schema.safeParse(4).success).toBe(false);
    });

    it('multipleOf with int() constraint', () => {
      const schema = z.number().int().multipleOf(5);
      expect(schema.safeParse(0).success).toBe(true);
      expect(schema.safeParse(5).success).toBe(true);
      expect(schema.safeParse(10).success).toBe(true);
      expect(schema.safeParse(3).success).toBe(false); // not a multiple of 5
      expect(schema.safeParse(5.5).success).toBe(false); // not an integer
    });

    it('multipleOf with decimal values', () => {
      const schema = z.number().multipleOf(0.5);
      expect(schema.safeParse(0).success).toBe(true);
      expect(schema.safeParse(0.5).success).toBe(true);
      expect(schema.safeParse(1.0).success).toBe(true);
      expect(schema.safeParse(1.5).success).toBe(true);
      expect(schema.safeParse(2.0).success).toBe(true);
      expect(schema.safeParse(0.3).success).toBe(false);
      expect(schema.safeParse(0.7).success).toBe(false);
    });
  });
});

describe('Zod BigInt Behavior Verification', () => {
  describe('Basic bigint validation', () => {
    it('z.bigint() accepts bigint values', () => {
      const schema = z.bigint();
      expect(schema.safeParse(42n).success).toBe(true);
      expect(schema.safeParse(-10n).success).toBe(true);
      expect(schema.safeParse(0n).success).toBe(true);
      expect(schema.safeParse(42).success).toBe(false); // number, not bigint
      expect(schema.safeParse('42').success).toBe(false);
    });
  });

  describe('BigInt constraints', () => {
    it('gt/lt constraints (exclusive)', () => {
      const schema = z.bigint().gt(0n).lt(100n);
      expect(schema.safeParse(0n).success).toBe(false);
      expect(schema.safeParse(1n).success).toBe(true);
      expect(schema.safeParse(50n).success).toBe(true);
      expect(schema.safeParse(99n).success).toBe(true);
      expect(schema.safeParse(100n).success).toBe(false);
    });

    it('gte/lte constraints (inclusive, aliases for min/max)', () => {
      const schema = z.bigint().gte(0n).lte(100n);
      expect(schema.safeParse(0n).success).toBe(true);
      expect(schema.safeParse(50n).success).toBe(true);
      expect(schema.safeParse(100n).success).toBe(true);
      expect(schema.safeParse(-1n).success).toBe(false);
      expect(schema.safeParse(101n).success).toBe(false);
    });

    it('positive/negative/nonnegative/nonpositive', () => {
      expect(z.bigint().positive().safeParse(1n).success).toBe(true);
      expect(z.bigint().positive().safeParse(0n).success).toBe(false);
      expect(z.bigint().negative().safeParse(-1n).success).toBe(true);
      expect(z.bigint().negative().safeParse(0n).success).toBe(false);
      expect(z.bigint().nonnegative().safeParse(0n).success).toBe(true);
      expect(z.bigint().nonpositive().safeParse(0n).success).toBe(true);
    });

    it('multipleOf constraint', () => {
      const schema = z.bigint().multipleOf(5n);
      expect(schema.safeParse(0n).success).toBe(true);
      expect(schema.safeParse(5n).success).toBe(true);
      expect(schema.safeParse(10n).success).toBe(true);
      expect(schema.safeParse(3n).success).toBe(false);
      expect(schema.safeParse(7n).success).toBe(false);
    });

    it('multipleOf with different step value', () => {
      const schema = z.bigint().multipleOf(3n);
      expect(schema.safeParse(0n).success).toBe(true);
      expect(schema.safeParse(3n).success).toBe(true);
      expect(schema.safeParse(6n).success).toBe(true);
      expect(schema.safeParse(9n).success).toBe(true);
      expect(schema.safeParse(1n).success).toBe(false);
      expect(schema.safeParse(2n).success).toBe(false);
      expect(schema.safeParse(4n).success).toBe(false);
    });

    it('multipleOf with constraints', () => {
      const schema = z.bigint().min(10n).max(50n).multipleOf(7n);
      expect(schema.safeParse(14n).success).toBe(true);
      expect(schema.safeParse(21n).success).toBe(true);
      expect(schema.safeParse(49n).success).toBe(true);
      expect(schema.safeParse(7n).success).toBe(false); // below min
      expect(schema.safeParse(56n).success).toBe(false); // above max
      expect(schema.safeParse(15n).success).toBe(false); // not a multiple of 7
    });
  });
});

describe('Zod UUID Behavior Verification', () => {
  describe('UUID versions', () => {
    it('z.uuid() accepts v4 by default', () => {
      const schema = z.uuid();
      expect(
        schema.safeParse('550e8400-e29b-41d4-a716-446655440000').success,
      ).toBe(true);
      expect(schema.safeParse('invalid-uuid').success).toBe(false);
    });

    it('z.uuid({ version: "v1" })', () => {
      const schema = z.uuid({ version: 'v1' });
      expect(
        schema.safeParse('c232ab00-9414-11ec-b909-0242ac120002').success,
      ).toBe(true);
      expect(
        schema.safeParse('550e8400-e29b-41d4-a716-446655440000').success,
      ).toBe(false);
    });

    it('z.uuid({ version: "v2" })', () => {
      const schema = z.uuid({ version: 'v2' });
      expect(
        schema.safeParse('000003e8-9414-21ec-b200-325096b39f47').success,
      ).toBe(true);
      expect(
        schema.safeParse('550e8400-e29b-41d4-a716-446655440000').success,
      ).toBe(false);
    });

    it('z.uuid({ version: "v3" })', () => {
      const schema = z.uuid({ version: 'v3' });
      expect(
        schema.safeParse('a3bb189e-8bf9-3888-9912-ace4e6543002').success,
      ).toBe(true);
      expect(
        schema.safeParse('550e8400-e29b-41d4-a716-446655440000').success,
      ).toBe(false);
    });

    it('z.uuid({ version: "v4" })', () => {
      const schema = z.uuid({ version: 'v4' });
      expect(
        schema.safeParse('550e8400-e29b-41d4-a716-446655440000').success,
      ).toBe(true);
      expect(
        schema.safeParse('a3bb189e-8bf9-3888-9912-ace4e6543002').success,
      ).toBe(false);
    });

    it('z.uuid({ version: "v5" })', () => {
      const schema = z.uuid({ version: 'v5' });
      expect(
        schema.safeParse('886313e1-3b8a-5372-9b90-0c9aee199e5d').success,
      ).toBe(true);
      expect(
        schema.safeParse('550e8400-e29b-41d4-a716-446655440000').success,
      ).toBe(false);
    });

    it('z.uuid({ version: "v6" })', () => {
      const schema = z.uuid({ version: 'v6' });
      expect(
        schema.safeParse('1ec9414c-232a-6b00-b3c8-9e6bdeced846').success,
      ).toBe(true);
      expect(
        schema.safeParse('550e8400-e29b-41d4-a716-446655440000').success,
      ).toBe(false);
    });

    it('z.uuid({ version: "v7" })', () => {
      const schema = z.uuid({ version: 'v7' });
      expect(
        schema.safeParse('017f22e2-79b0-7cc3-98c4-dc0c0c07398f').success,
      ).toBe(true);
      expect(
        schema.safeParse('550e8400-e29b-41d4-a716-446655440000').success,
      ).toBe(false);
    });

    it('z.uuid({ version: "v8" })', () => {
      const schema = z.uuid({ version: 'v8' });
      expect(
        schema.safeParse('320c3d4d-cc00-875b-8ec9-32d5f69181c0').success,
      ).toBe(true);
      expect(
        schema.safeParse('550e8400-e29b-41d4-a716-446655440000').success,
      ).toBe(false);
    });
  });
});

describe('Zod Collection Behavior Verification', () => {
  describe('Map', () => {
    it('z.map() validates Map instances', () => {
      const schema = z.map(z.string(), z.number());
      const validMap = new Map([
        ['a', 1],
        ['b', 2],
      ]);
      expect(schema.safeParse(validMap).success).toBe(true);
      expect(schema.safeParse(new Map()).success).toBe(true);
      expect(schema.safeParse({}).success).toBe(false);
    });

    it('z.map() with min/max constraints', () => {
      const schema = z.map(z.string(), z.number()).min(2).max(5);
      expect(schema.safeParse(new Map([['a', 1]])).success).toBe(false);
      expect(
        schema.safeParse(
          new Map([
            ['a', 1],
            ['b', 2],
          ]),
        ).success,
      ).toBe(true);
      expect(
        schema.safeParse(
          new Map([
            ['a', 1],
            ['b', 2],
            ['c', 3],
            ['d', 4],
            ['e', 5],
            ['f', 6],
          ]),
        ).success,
      ).toBe(false);
    });

    it('z.map() with size constraint', () => {
      const schema = z.map(z.string(), z.number()).size(3);
      expect(
        schema.safeParse(
          new Map([
            ['a', 1],
            ['b', 2],
            ['c', 3],
          ]),
        ).success,
      ).toBe(true);
      expect(
        schema.safeParse(
          new Map([
            ['a', 1],
            ['b', 2],
          ]),
        ).success,
      ).toBe(false);
      expect(
        schema.safeParse(
          new Map([
            ['a', 1],
            ['b', 2],
            ['c', 3],
            ['d', 4],
          ]),
        ).success,
      ).toBe(false);
    });
  });

  describe('Set', () => {
    it('z.set() validates Set instances', () => {
      const schema = z.set(z.number());
      expect(schema.safeParse(new Set([1, 2, 3])).success).toBe(true);
      expect(schema.safeParse(new Set()).success).toBe(true);
      expect(schema.safeParse([1, 2, 3]).success).toBe(false);
    });

    it('z.set() with min/max constraints', () => {
      const schema = z.set(z.number()).min(2).max(5);
      expect(schema.safeParse(new Set([1])).success).toBe(false);
      expect(schema.safeParse(new Set([1, 2])).success).toBe(true);
      expect(schema.safeParse(new Set([1, 2, 3, 4, 5, 6])).success).toBe(false);
    });

    it('z.set() with size constraint', () => {
      const schema = z.set(z.number()).size(3);
      expect(schema.safeParse(new Set([1, 2, 3])).success).toBe(true);
      expect(schema.safeParse(new Set([1, 2])).success).toBe(false);
      expect(schema.safeParse(new Set([1, 2, 3, 4])).success).toBe(false);
    });
  });

  describe('Tuple', () => {
    it('z.tuple() validates fixed-length arrays', () => {
      const schema = z.tuple([z.string(), z.number()]);
      expect(schema.safeParse(['hello', 42]).success).toBe(true);
      expect(schema.safeParse(['hello']).success).toBe(false);
      expect(schema.safeParse(['hello', 42, 'extra']).success).toBe(false);
      expect(schema.safeParse([42, 'hello']).success).toBe(false);
    });

    it('z.tuple() with rest', () => {
      const schema = z.tuple([z.string(), z.number()]).rest(z.boolean());
      expect(schema.safeParse(['hello', 42]).success).toBe(true);
      expect(schema.safeParse(['hello', 42, true]).success).toBe(true);
      expect(schema.safeParse(['hello', 42, true, false, true]).success).toBe(
        true,
      );
      expect(schema.safeParse(['hello', 42, 'invalid']).success).toBe(false);
    });
  });
});

describe('Zod Literal and Enum Behavior Verification', () => {
  describe('Literal', () => {
    it('z.literal() only accepts exact value', () => {
      const schema = z.literal('hello');
      expect(schema.safeParse('hello').success).toBe(true);
      expect(schema.safeParse('Hello').success).toBe(false);
      expect(schema.safeParse('world').success).toBe(false);
    });

    it('z.literal() with numbers', () => {
      const schema = z.literal(42);
      expect(schema.safeParse(42).success).toBe(true);
      expect(schema.safeParse(43).success).toBe(false);
      expect(schema.safeParse('42').success).toBe(false);
    });

    it('z.literal() with boolean', () => {
      const schema = z.literal(true);
      expect(schema.safeParse(true).success).toBe(true);
      expect(schema.safeParse(false).success).toBe(false);
    });

    it('z.literal([]) creates union of literals', () => {
      const schema = z.literal(['red', 'green', 'blue']);
      expect(schema.safeParse('red').success).toBe(true);
      expect(schema.safeParse('green').success).toBe(true);
      expect(schema.safeParse('blue').success).toBe(true);
      expect(schema.safeParse('yellow').success).toBe(false);
    });

    it('z.literal([]) with mixed types', () => {
      const schema = z.literal(['hello', 42, true]);
      expect(schema.safeParse('hello').success).toBe(true);
      expect(schema.safeParse(42).success).toBe(true);
      expect(schema.safeParse(true).success).toBe(true);
      expect(schema.safeParse('world').success).toBe(false);
      expect(schema.safeParse(43).success).toBe(false);
      expect(schema.safeParse(false).success).toBe(false);
    });

    it('z.literal([]) with single value behaves like regular literal', () => {
      const schema = z.literal(['only']);
      expect(schema.safeParse('only').success).toBe(true);
      expect(schema.safeParse('other').success).toBe(false);
    });
  });

  describe('Enum', () => {
    it('z.enum() accepts values from array', () => {
      const schema = z.enum(['red', 'green', 'blue']);
      expect(schema.safeParse('red').success).toBe(true);
      expect(schema.safeParse('green').success).toBe(true);
      expect(schema.safeParse('blue').success).toBe(true);
      expect(schema.safeParse('yellow').success).toBe(false);
    });

    it('z.nativeEnum() with TypeScript enum', () => {
      enum Color {
        Red = 'RED',
        Green = 'GREEN',
        Blue = 'BLUE',
      }
      const schema = z.nativeEnum(Color);
      expect(schema.safeParse('RED').success).toBe(true);
      expect(schema.safeParse('GREEN').success).toBe(true);
      expect(schema.safeParse('BLUE').success).toBe(true);
      expect(schema.safeParse('YELLOW').success).toBe(false);
    });

    it('z.nativeEnum() with numeric enum', () => {
      enum Status {
        Pending,
        Active,
        Complete,
      }
      const schema = z.nativeEnum(Status);
      expect(schema.safeParse(0).success).toBe(true);
      expect(schema.safeParse(1).success).toBe(true);
      expect(schema.safeParse(2).success).toBe(true);
      expect(schema.safeParse(3).success).toBe(false);
    });
  });
});

describe('Zod Array and Object Behavior Verification', () => {
  describe('Array', () => {
    it('z.array() validates array elements', () => {
      const schema = z.array(z.number());
      expect(schema.safeParse([1, 2, 3]).success).toBe(true);
      expect(schema.safeParse([]).success).toBe(true);
      expect(schema.safeParse([1, 'two', 3]).success).toBe(false);
    });

    it('z.array() with length constraints', () => {
      const schema = z.array(z.string()).min(2).max(5);
      expect(schema.safeParse(['a']).success).toBe(false);
      expect(schema.safeParse(['a', 'b']).success).toBe(true);
      expect(schema.safeParse(['a', 'b', 'c', 'd', 'e']).success).toBe(true);
      expect(schema.safeParse(['a', 'b', 'c', 'd', 'e', 'f']).success).toBe(
        false,
      );
    });

    it('z.array().length() exact length', () => {
      const schema = z.array(z.number()).length(3);
      expect(schema.safeParse([1, 2, 3]).success).toBe(true);
      expect(schema.safeParse([1, 2]).success).toBe(false);
      expect(schema.safeParse([1, 2, 3, 4]).success).toBe(false);
    });

    it('z.array().nonempty() requires at least one element', () => {
      const schema = z.array(z.string()).nonempty();
      expect(schema.safeParse(['a']).success).toBe(true);
      expect(schema.safeParse([]).success).toBe(false);
    });
  });

  describe('Object', () => {
    it('z.object() validates object shape', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });
      expect(schema.safeParse({ name: 'John', age: 30 }).success).toBe(true);
      expect(schema.safeParse({ name: 'John' }).success).toBe(false);
      expect(schema.safeParse({ name: 'John', age: '30' }).success).toBe(false);
    });

    it('z.object() strips unknown keys by default', () => {
      const schema = z.object({
        name: z.string(),
      });
      const result = schema.safeParse({ name: 'John', extra: 'value' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ name: 'John' });
      }
    });

    it('z.object().strict() rejects unknown keys', () => {
      const schema = z
        .object({
          name: z.string(),
        })
        .strict();
      expect(schema.safeParse({ name: 'John' }).success).toBe(true);
      expect(schema.safeParse({ name: 'John', extra: 'value' }).success).toBe(
        false,
      );
    });

    it('z.object().passthrough() keeps unknown keys', () => {
      const schema = z
        .object({
          name: z.string(),
        })
        .passthrough();
      const result = schema.safeParse({ name: 'John', extra: 'value' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ name: 'John', extra: 'value' });
      }
    });

    it('z.object().catchall() validates unknown keys', () => {
      const schema = z
        .object({
          name: z.string(),
        })
        .catchall(z.number());
      expect(schema.safeParse({ name: 'John', age: 30 }).success).toBe(true);
      expect(schema.safeParse({ name: 'John', age: '30' }).success).toBe(false);
    });

    it('z.object().partial() makes all fields optional', () => {
      const schema = z
        .object({
          name: z.string(),
          age: z.number(),
        })
        .partial();
      expect(schema.safeParse({}).success).toBe(true);
      expect(schema.safeParse({ name: 'John' }).success).toBe(true);
      expect(schema.safeParse({ age: 30 }).success).toBe(true);
      expect(schema.safeParse({ name: 'John', age: 30 }).success).toBe(true);
    });

    it('z.object().required() makes all fields required', () => {
      const schema = z
        .object({
          name: z.string().optional(),
          age: z.number().optional(),
        })
        .required();
      expect(schema.safeParse({ name: 'John', age: 30 }).success).toBe(true);
      expect(schema.safeParse({ name: 'John' }).success).toBe(false);
      expect(schema.safeParse({}).success).toBe(false);
    });

    it('z.strictObject() rejects unknown keys by default', () => {
      const schema = z.strictObject({
        name: z.string(),
      });
      expect(schema.safeParse({ name: 'John' }).success).toBe(true);
      expect(schema.safeParse({ name: 'John', extra: 'value' }).success).toBe(
        false,
      );
    });

    it('z.looseObject() allows unknown keys by default', () => {
      const schema = z.looseObject({
        name: z.string(),
      });
      const result = schema.safeParse({ name: 'John', extra: 'value' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ name: 'John', extra: 'value' });
      }
    });

    it('z.object().extend() adds new fields', () => {
      const baseSchema = z.object({
        name: z.string(),
      });
      const extendedSchema = baseSchema.extend({
        age: z.number(),
      });
      expect(extendedSchema.safeParse({ name: 'John', age: 30 }).success).toBe(
        true,
      );
      expect(extendedSchema.safeParse({ name: 'John' }).success).toBe(false);
      expect(baseSchema.safeParse({ name: 'John' }).success).toBe(true);
    });

    it('z.object().extend() overwrites existing fields', () => {
      const baseSchema = z.object({
        name: z.string(),
        age: z.number(),
      });
      const extendedSchema = baseSchema.extend({
        age: z.string(), // overwrite age to string
      });
      expect(
        extendedSchema.safeParse({ name: 'John', age: '30' }).success,
      ).toBe(true);
      expect(extendedSchema.safeParse({ name: 'John', age: 30 }).success).toBe(
        false,
      );
    });

    it('z.object().safeExtend() does not overwrite existing fields', () => {
      const baseSchema = z.object({
        name: z.string(),
        age: z.number(),
      });
      const extendedSchema = baseSchema.safeExtend({
        email: z.string(),
      });
      expect(
        extendedSchema.safeParse({ name: 'John', age: 30, email: 'a@b.com' })
          .success,
      ).toBe(true);
      expect(extendedSchema.safeParse({ name: 'John', age: 30 }).success).toBe(
        false,
      ); // email is required
    });

    it('z.object().pick() selects specific fields', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
        email: z.string(),
      });
      const pickedSchema = schema.pick({ name: true, age: true });
      expect(pickedSchema.safeParse({ name: 'John', age: 30 }).success).toBe(
        true,
      );
      expect(
        pickedSchema.safeParse({ name: 'John', age: 30, email: 'a@b.com' })
          .success,
      ).toBe(true); // extra fields are stripped
    });

    it('z.object().omit() excludes specific fields', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
        email: z.string(),
      });
      const omittedSchema = schema.omit({ email: true });
      expect(omittedSchema.safeParse({ name: 'John', age: 30 }).success).toBe(
        true,
      );
      expect(
        omittedSchema.safeParse({ name: 'John', age: 30, email: 'a@b.com' })
          .success,
      ).toBe(true); // extra email field is stripped
    });

    it('z.object().keyof() creates enum of keys', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
        email: z.string(),
      });
      const keySchema = schema.keyof();
      expect(keySchema.safeParse('name').success).toBe(true);
      expect(keySchema.safeParse('age').success).toBe(true);
      expect(keySchema.safeParse('email').success).toBe(true);
      expect(keySchema.safeParse('invalid').success).toBe(false);
    });
  });

  describe('Record', () => {
    it('z.record() validates key-value pairs', () => {
      const schema = z.record(z.string(), z.number());
      expect(schema.safeParse({ a: 1, b: 2 }).success).toBe(true);
      expect(schema.safeParse({}).success).toBe(true);
      expect(schema.safeParse({ a: 1, b: 'two' }).success).toBe(false);
    });

    it('z.record() with specific key type', () => {
      const schema = z.record(z.enum(['foo', 'bar']), z.number());
      expect(schema.safeParse({ foo: 1, bar: 2 }).success).toBe(true);
      expect(schema.safeParse({ foo: 1 }).success).toBe(false); // enum keys require all keys
      expect(schema.safeParse({ baz: 3 }).success).toBe(false);
    });

    it('z.record() with enum requires all enum keys (Zod v4 behavior)', () => {
      const schema = z.record(z.enum(['a', 'b', 'c']), z.string());
      expect(schema.safeParse({ a: 'foo', b: 'bar', c: 'baz' }).success).toBe(
        true,
      );
      expect(schema.safeParse({ a: 'foo', b: 'bar' }).success).toBe(false); // missing 'c'
      expect(schema.safeParse({ a: 'foo' }).success).toBe(false); // missing 'b' and 'c'
    });

    it('z.record() with literal requires that exact key', () => {
      const schema = z.record(z.literal('id'), z.string());
      expect(schema.safeParse({ id: 'value' }).success).toBe(true);
      expect(schema.safeParse({}).success).toBe(false); // missing required key 'id'
      expect(schema.safeParse({ id: 'value', other: 'ignored' }).success).toBe(
        false,
      ); // extra keys are rejected with literal key
    });
  });

  describe('Partial Record', () => {
    it('z.partialRecord() allows partial keys from enum', () => {
      const schema = z.partialRecord(
        z.enum(['id', 'name', 'email']),
        z.string(),
      );
      expect(schema.safeParse({}).success).toBe(true); // all optional
      expect(schema.safeParse({ id: '1' }).success).toBe(true);
      expect(schema.safeParse({ id: '1', name: 'John' }).success).toBe(true);
      expect(
        schema.safeParse({ id: '1', name: 'John', email: 'a@b.com' }).success,
      ).toBe(true);
    });

    it('z.partialRecord() skips exhaustiveness checks', () => {
      const Keys = z.enum(['foo', 'bar', 'baz']);
      const schema = z.partialRecord(Keys, z.number());

      // Unlike z.record(), partial record doesn't require all keys
      expect(schema.safeParse({ foo: 1 }).success).toBe(true);
      expect(schema.safeParse({ foo: 1, bar: 2 }).success).toBe(true);
      expect(schema.safeParse({ foo: 1, bar: 2, baz: 3 }).success).toBe(true);
      expect(schema.safeParse({}).success).toBe(true);
    });

    it('z.partialRecord() validates value types', () => {
      const schema = z.partialRecord(z.enum(['a', 'b']), z.number());
      expect(schema.safeParse({ a: 1 }).success).toBe(true);
      expect(schema.safeParse({ a: 1, b: 2 }).success).toBe(true);
      expect(schema.safeParse({ a: '1' }).success).toBe(false); // wrong value type
    });

    it('z.partialRecord() with literal keys', () => {
      const schema = z.partialRecord(
        z.literal(['active', 'inactive']),
        z.boolean(),
      );
      expect(schema.safeParse({}).success).toBe(true);
      expect(schema.safeParse({ active: true }).success).toBe(true);
      expect(schema.safeParse({ inactive: false }).success).toBe(true);
      expect(schema.safeParse({ active: true, inactive: false }).success).toBe(
        true,
      );
    });

    it('z.partialRecord() rejects unknown keys from enum', () => {
      const schema = z.partialRecord(z.enum(['a', 'b']), z.string());
      expect(schema.safeParse({ a: 'foo' }).success).toBe(true);
      expect(schema.safeParse({ c: 'bar' }).success).toBe(false); // 'c' not in enum
      expect(schema.safeParse({ a: 'foo', c: 'bar' }).success).toBe(false); // 'c' not in enum
    });
  });

  describe('Circular references', () => {
    it('circular reference with getter - User and Post', () => {
      const User: z.ZodType<{
        email: string;
        posts: {
          title: string;
          author: any;
        }[];
      }> = z.object({
        email: z.email(),
        get posts() {
          return z.array(Post);
        },
      });

      const Post: z.ZodType<{
        title: string;
        author: {
          email: string;
          posts: any[];
        };
      }> = z.object({
        title: z.string(),
        get author() {
          return User;
        },
      });

      const validUser = {
        email: 'user@example.com',
        posts: [
          {
            title: 'My Post',
            author: {
              email: 'user@example.com',
              posts: [],
            },
          },
        ],
      };

      expect(User.safeParse(validUser).success).toBe(true);
      expect(Post.safeParse(validUser.posts[0]).success).toBe(true);
    });

    it('circular reference with getter - nested validation', () => {
      const Category: z.ZodType<{
        name: string;
        parent?: any;
        children: any[];
      }> = z.object({
        name: z.string(),
        get parent() {
          return Category.optional();
        },
        get children() {
          return z.array(Category);
        },
      });

      const rootCategory = {
        name: 'Root',
        children: [
          {
            name: 'Child1',
            parent: { name: 'Root', children: [] },
            children: [],
          },
          {
            name: 'Child2',
            children: [],
          },
        ],
      };

      expect(Category.safeParse(rootCategory).success).toBe(true);
    });

    it('circular reference fails with invalid nested data', () => {
      const Node: z.ZodType<{
        value: number;
        next?: any;
      }> = z.object({
        value: z.number(),
        get next() {
          return Node.optional();
        },
      });

      const validLinkedList = {
        value: 1,
        next: {
          value: 2,
          next: {
            value: 3,
          },
        },
      };

      const invalidLinkedList = {
        value: 1,
        next: {
          value: 'invalid', // should be number
        },
      };

      expect(Node.safeParse(validLinkedList).success).toBe(true);
      expect(Node.safeParse(invalidLinkedList).success).toBe(false);
    });

    it('circular reference with nullable array - Activity', () => {
      const Activity = z.object({
        name: z.string(),
        get subactivities(): z.ZodNullable<z.ZodArray<typeof Activity>> {
          return z.nullable(z.array(Activity));
        },
      });

      const validActivity = {
        name: 'Main Activity',
        subactivities: [
          {
            name: 'Sub Activity 1',
            subactivities: null,
          },
          {
            name: 'Sub Activity 2',
            subactivities: [
              {
                name: 'Nested Activity',
                subactivities: null,
              },
            ],
          },
        ],
      };

      const activityWithNull = {
        name: 'Solo Activity',
        subactivities: null,
      };

      const invalidActivity = {
        name: 'Invalid Activity',
        subactivities: [
          {
            name: 123, // should be string
            subactivities: null,
          },
        ],
      };

      expect(Activity.safeParse(validActivity).success).toBe(true);
      expect(Activity.safeParse(activityWithNull).success).toBe(true);
      expect(Activity.safeParse(invalidActivity).success).toBe(false);
    });
  });

  describe('Union types', () => {
    it('z.union() accepts any matching option', () => {
      const schema = z.union([z.string(), z.number()]);
      expect(schema.safeParse('hello').success).toBe(true);
      expect(schema.safeParse(42).success).toBe(true);
      expect(schema.safeParse(true).success).toBe(false);
    });

    it('z.union() with object schemas', () => {
      const schema = z.union([
        z.object({ type: z.literal('card'), cardNumber: z.string() }),
        z.object({ type: z.literal('bank'), accountNumber: z.string() }),
      ]);
      expect(
        schema.safeParse({ type: 'card', cardNumber: '1234' }).success,
      ).toBe(true);
      expect(
        schema.safeParse({ type: 'bank', accountNumber: '5678' }).success,
      ).toBe(true);
      expect(schema.safeParse({ type: 'cash', amount: 100 }).success).toBe(
        false,
      );
    });

    it('z.union() checks options in order', () => {
      const schema = z.union([z.any(), z.string()]);
      // any matches first, so string will never be checked
      expect(schema.safeParse('hello').success).toBe(true);
      expect(schema.safeParse(42).success).toBe(true);
    });
  });

  describe('Exclusive union (XOR)', () => {
    it('z.xor() requires exactly one option to match', () => {
      const schema = z.xor([z.string(), z.number()]);
      expect(schema.safeParse('hello').success).toBe(true);
      expect(schema.safeParse(42).success).toBe(true);
      expect(schema.safeParse(true).success).toBe(false); // zero matches
    });

    it('z.xor() fails when multiple options match', () => {
      const schema = z.xor([z.string(), z.any()]);
      // 'hello' matches both string and any, so it fails
      expect(schema.safeParse('hello').success).toBe(false);
      expect(schema.safeParse(42).success).toBe(true); // only matches any
    });

    it('z.xor() with object schemas for mutual exclusivity', () => {
      const schema = z.xor([
        z.object({ type: z.literal('card'), cardNumber: z.string() }),
        z.object({ type: z.literal('bank'), accountNumber: z.string() }),
      ]);
      expect(
        schema.safeParse({ type: 'card', cardNumber: '1234' }).success,
      ).toBe(true);
      expect(
        schema.safeParse({ type: 'bank', accountNumber: '5678' }).success,
      ).toBe(true);
      expect(schema.safeParse({ type: 'cash' }).success).toBe(false);
    });
  });

  describe('Discriminated union', () => {
    it('z.discriminatedUnion() uses discriminator for efficient parsing', () => {
      const schema = z.discriminatedUnion('status', [
        z.object({ status: z.literal('success'), data: z.string() }),
        z.object({ status: z.literal('failed'), error: z.string() }),
      ]);
      expect(
        schema.safeParse({ status: 'success', data: 'result' }).success,
      ).toBe(true);
      expect(
        schema.safeParse({ status: 'failed', error: 'error message' }).success,
      ).toBe(true);
      expect(schema.safeParse({ status: 'pending' }).success).toBe(false);
    });

    it('z.discriminatedUnion() with enum discriminator', () => {
      const schema = z.discriminatedUnion('type', [
        z.object({ type: z.literal('card'), cardNumber: z.string() }),
        z.object({ type: z.literal('bank'), accountNumber: z.string() }),
        z.object({ type: z.literal('cash'), amount: z.number() }),
      ]);
      expect(
        schema.safeParse({ type: 'card', cardNumber: '1234' }).success,
      ).toBe(true);
      expect(
        schema.safeParse({ type: 'bank', accountNumber: '5678' }).success,
      ).toBe(true);
      expect(schema.safeParse({ type: 'cash', amount: 100 }).success).toBe(
        true,
      );
      expect(schema.safeParse({ type: 'check', number: '999' }).success).toBe(
        false,
      );
    });

    it('z.discriminatedUnion() with nested discriminated unions', () => {
      const BaseError = {
        status: z.literal('failed'),
        message: z.string(),
      };
      const MyErrors = z.discriminatedUnion('code', [
        z.object({ ...BaseError, code: z.literal(400) }),
        z.object({ ...BaseError, code: z.literal(401) }),
        z.object({ ...BaseError, code: z.literal(500) }),
      ]);

      const MyResult = z.discriminatedUnion('status', [
        z.object({ status: z.literal('success'), data: z.string() }),
        MyErrors,
      ]);

      expect(
        MyResult.safeParse({ status: 'success', data: 'result' }).success,
      ).toBe(true);
      expect(
        MyResult.safeParse({
          status: 'failed',
          code: 400,
          message: 'Bad Request',
        }).success,
      ).toBe(true);
      expect(
        MyResult.safeParse({
          status: 'failed',
          code: 401,
          message: 'Unauthorized',
        }).success,
      ).toBe(true);
      expect(
        MyResult.safeParse({
          status: 'failed',
          code: 500,
          message: 'Internal Server Error',
        }).success,
      ).toBe(true);
      expect(
        MyResult.safeParse({
          status: 'failed',
          code: 404,
          message: 'Not Found',
        }).success,
      ).toBe(false);
    });

    it('z.discriminatedUnion() validates discriminator is literal', () => {
      const schema = z.discriminatedUnion('type', [
        z.object({ type: z.literal('A'), value: z.string() }),
        z.object({ type: z.literal('B'), value: z.number() }),
      ]);
      expect(schema.safeParse({ type: 'A', value: 'text' }).success).toBe(true);
      expect(schema.safeParse({ type: 'B', value: 42 }).success).toBe(true);
      expect(schema.safeParse({ type: 'A', value: 42 }).success).toBe(false); // wrong value type
      expect(schema.safeParse({ type: 'B', value: 'text' }).success).toBe(
        false,
      ); // wrong value type
    });
  });

  describe('Intersection types', () => {
    it('z.intersection() represents logical AND', () => {
      const a = z.union([z.number(), z.string()]);
      const b = z.union([z.number(), z.boolean()]);
      const c = z.intersection(a, b);

      // only number satisfies both unions
      expect(c.safeParse(42).success).toBe(true);
      expect(c.safeParse('hello').success).toBe(false); // only in 'a'
      expect(c.safeParse(true).success).toBe(false); // only in 'b'
    });

    it('z.intersection() with object types merges fields', () => {
      const Person = z.object({ name: z.string() });
      const Employee = z.object({ role: z.string() });
      const EmployedPerson = z.intersection(Person, Employee);

      expect(
        EmployedPerson.safeParse({ name: 'John', role: 'Developer' }).success,
      ).toBe(true);
      expect(EmployedPerson.safeParse({ name: 'John' }).success).toBe(false); // missing role
      expect(EmployedPerson.safeParse({ role: 'Developer' }).success).toBe(
        false,
      ); // missing name
    });

    it('z.intersection() with overlapping object fields', () => {
      const A = z.object({ id: z.number(), name: z.string() });
      const B = z.object({ id: z.number(), age: z.number() });
      const C = z.intersection(A, B);

      expect(C.safeParse({ id: 1, name: 'John', age: 30 }).success).toBe(true);
      expect(C.safeParse({ id: 1, name: 'John' }).success).toBe(false); // missing age
    });

    it('z.intersection() creates ZodIntersection without object methods', () => {
      const Person = z.object({ name: z.string() });
      const Employee = z.object({ role: z.string() });
      const EmployedPerson = z.intersection(Person, Employee);

      // ZodIntersection doesn't have pick/omit methods
      expect(EmployedPerson).not.toHaveProperty('pick');
      expect(EmployedPerson).not.toHaveProperty('omit');

      // Using extend() instead gives ZodObject with methods
      const EmployedPersonExtended = Person.extend({ role: z.string() });
      expect(EmployedPersonExtended).toHaveProperty('pick');
      expect(EmployedPersonExtended).toHaveProperty('omit');
    });

    it('z.intersection() with primitives requires both conditions', () => {
      const stringMin5 = z.string().min(5);
      const stringMax10 = z.string().max(10);
      const schema = z.intersection(stringMin5, stringMax10);

      expect(schema.safeParse('hello').success).toBe(true); // 5 chars
      expect(schema.safeParse('helloworld').success).toBe(true); // 10 chars
      expect(schema.safeParse('hi').success).toBe(false); // too short
      expect(schema.safeParse('hello world!').success).toBe(false); // too long
    });

    it('z.intersection() with conflicting types always fails', () => {
      const stringType = z.string();
      const numberType = z.number();
      const impossible = z.intersection(stringType, numberType);

      // no value can be both string AND number
      expect(impossible.safeParse('hello').success).toBe(false);
      expect(impossible.safeParse(42).success).toBe(false);
      expect(impossible.safeParse(null).success).toBe(false);
    });
  });

  describe('Instanceof and Property checks', () => {
    it('z.instanceof() validates class instances', () => {
      class User {
        constructor(public name: string) {}
      }

      const schema = z.instanceof(User);
      expect(schema.safeParse(new User('John')).success).toBe(true);
      expect(schema.safeParse({ name: 'John' }).success).toBe(false); // plain object
      expect(schema.safeParse('John').success).toBe(false);
    });

    it('z.instanceof() with built-in classes', () => {
      const dateSchema = z.instanceof(Date);
      expect(dateSchema.safeParse(new Date()).success).toBe(true);
      expect(dateSchema.safeParse('2024-01-01').success).toBe(false);

      const errorSchema = z.instanceof(Error);
      expect(errorSchema.safeParse(new Error('test')).success).toBe(true);
      expect(errorSchema.safeParse({ message: 'test' }).success).toBe(false);
    });

    it('z.instanceof() with URL class', () => {
      const schema = z.instanceof(URL);
      expect(schema.safeParse(new URL('https://example.com')).success).toBe(
        true,
      );
      expect(schema.safeParse('https://example.com').success).toBe(false);
    });

    it('z.property() validates specific property', () => {
      const schema = z.string().check(z.property('length', z.number().min(10)));

      expect(schema.safeParse('hello there!').success).toBe(true); // length 12
      expect(schema.safeParse('hello.').success).toBe(false); // length 6
    });

    it('z.instanceof() with z.property() for URL protocol', () => {
      const schema = z
        .instanceof(URL)
        .check(z.property('protocol', z.literal('https:' as string)));

      expect(schema.safeParse(new URL('https://example.com')).success).toBe(
        true,
      );
      expect(schema.safeParse(new URL('http://example.com')).success).toBe(
        false,
      );
    });

    it('z.property() with array length validation', () => {
      const schema = z
        .array(z.number())
        .check(z.property('length', z.number().min(2).max(4)));

      expect(schema.safeParse([1, 2, 3]).success).toBe(true);
      expect(schema.safeParse([1]).success).toBe(false); // too short
      expect(schema.safeParse([1, 2, 3, 4, 5]).success).toBe(false); // too long
    });

    it('z.property() with object property validation', () => {
      const schema = z
        .object({ name: z.string(), age: z.number() })
        .check(z.property('age', z.number().min(18)));

      expect(schema.safeParse({ name: 'John', age: 25 }).success).toBe(true);
      expect(schema.safeParse({ name: 'Jane', age: 16 }).success).toBe(false);
    });

    it('z.property() with nested property', () => {
      const schema = z.string().check(
        z.property('length', z.number().gte(5).lte(10)),
      );

      expect(schema.safeParse('hello').success).toBe(true); // 5 chars
      expect(schema.safeParse('helloworld').success).toBe(true); // 10 chars
      expect(schema.safeParse('hi').success).toBe(false); // 2 chars
      expect(schema.safeParse('hello world!').success).toBe(false); // 12 chars
    });
  });
});
