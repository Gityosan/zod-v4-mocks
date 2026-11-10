import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { initGenerator } from '../../src/mock-generator';

// Schemas / behaviours introduced or changed in zod 4.5 – 4.6.
const SEEDS = Array.from({ length: 40 }, (_, i) => i);

function expectAllValid(schema: z.ZodType) {
  for (const seed of SEEDS) {
    const value = initGenerator({ seed }).generate(schema);
    const result = schema.safeParse(value);
    expect(result.success, `seed=${seed} value=${String(value)}`).toBe(true);
  }
}

describe('zod 4.5 / 4.6 support', () => {
  describe('new string formats', () => {
    it('z.creditCard()', () => expectAllValid(z.creditCard()));
    it('z.string().check(z.creditCard())', () =>
      expectAllValid(z.string().check(z.creditCard())));
    it('z.iban()', () => expectAllValid(z.iban()));
    it('z.string().check(z.iban())', () =>
      expectAllValid(z.string().check(z.iban())));
    it('z.currencyCode()', () => expectAllValid(z.currencyCode()));
  });

  describe('stricter validation', () => {
    it('z.base64() satisfies padding/length rules', () =>
      expectAllValid(z.base64()));
    it('z.string().base64()', () => expectAllValid(z.string().base64()));
    it('z.emoji() with code-point length bounds', () =>
      expectAllValid(z.emoji().min(3).max(5)));
    it('z.string().emoji() with length bounds', () =>
      expectAllValid(z.string().emoji().min(2).max(4)));
    it('z.emoji().length()', () => expectAllValid(z.emoji().length(3)));
  });

  describe('object symbol keys', () => {
    it('generates values for symbol keys', () => {
      const key = Symbol('key');
      const schema = z.object({ [key]: z.string(), name: z.number() });
      expectAllValid(schema);
      const value = initGenerator({ seed: 1 }).generate(schema) as Record<
        string | symbol,
        unknown
      >;
      expect(typeof value[key]).toBe('string');
      expect(typeof value.name).toBe('number');
    });
  });

  describe('optional tuple items', () => {
    it('tuple.partial()', () =>
      expectAllValid(z.tuple([z.string(), z.number()]).partial()));
    it('optional item before a required item', () =>
      expectAllValid(z.tuple([z.string().optional(), z.number()])));
    it('exactOptional item in the middle', () =>
      expectAllValid(
        z.tuple([z.string(), z.number().exactOptional(), z.boolean()]),
      ));
  });

  describe('object helpers', () => {
    it('.exactPartial()', () =>
      expectAllValid(
        z.object({ a: z.string(), b: z.number() }).exactPartial(),
      ));
  });

  describe('number formats', () => {
    it('z.float32()', () => expectAllValid(z.float32()));
    it('z.float64()', () => expectAllValid(z.float64()));
  });
});
