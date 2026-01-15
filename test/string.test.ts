import { describe, expect, it } from 'vitest';
import { z } from 'zod/v4';
import { initGenerator } from '../src/mock-generator';

describe('ZodString - Comprehensive Tests', () => {
  const generator = initGenerator({ seed: 12345 });

  describe('Multiple checks handling', () => {
    it('multiple regex checks - only last one applied', () => {
      const schema = z
        .string()
        .regex(/^[A-Z]/)
        .regex(/\d$/);
      const result = generator.generate(schema);
      const parseResult = schema.safeParse(result);
      expect(parseResult.success).toBe(false);
    });

    it('multiple startsWith checks - only last one applied', () => {
      const schema = z.string().startsWith('A').startsWith('AB');
      const result = generator.generate(schema);
      const parseResult = schema.safeParse(result);
      expect(parseResult.success).toBe(true);
    });

    it('multiple endsWith checks - only last one applied', () => {
      const schema = z.string().endsWith('X').endsWith('XY');
      const result = generator.generate(schema);
      const parseResult = schema.safeParse(result);
      expect(parseResult.success).toBe(false);
    });

    it('multiple includes checks - all applied', () => {
      const schema = z.string().includes('AAA').includes('BBB');
      const result = generator.generate(schema);
      const parseResult = schema.safeParse(result);
      expect(result).toContain('AAA');
      expect(result).toContain('BBB');
      expect(parseResult.success).toBe(true);
    });

    it('multiple length checks - only last one applied', () => {
      const schema = z.string().length(5).length(10);
      const result = generator.generate(schema);
      expect(result.length).toBe(10);
    });
  });

  describe('Length constraints', () => {
    it('exact length with length()', () => {
      const schema = z.string().length(10);
      const result = generator.generate(schema);
      expect(result.length).toBe(10);
    });

    it('min and max constraints', () => {
      const schema = z.string().min(5).max(10);
      const result = generator.generate(schema);
      expect(result.length).toBeGreaterThanOrEqual(5);
      expect(result.length).toBeLessThanOrEqual(10);
    });

    it('length with startsWith', () => {
      const schema = z.string().length(10).startsWith('ABC');
      const result = generator.generate(schema);
      expect(result.length).toBe(10);
      expect(result.startsWith('ABC')).toBe(true);
    });

    it('length with endsWith', () => {
      const schema = z.string().length(10).endsWith('XYZ');
      const result = generator.generate(schema);
      expect(result.length).toBe(10);
      expect(result.endsWith('XYZ')).toBe(true);
    });

    it('max constraint with startsWith', () => {
      const schema = z.string().max(10).startsWith('PREFIX');
      const result = generator.generate(schema);
      expect(result.length).toBeLessThanOrEqual(10);
      expect(result.startsWith('PREFIX')).toBe(true);
    });
  });

  describe('Case transformations', () => {
    it('toUpperCase transformation', () => {
      const schema = z.string().toUpperCase();
      const result = generator.generate(schema);
      expect(result).toBe(result.toUpperCase());
    });

    it('toLowerCase transformation', () => {
      const schema = z.string().toLowerCase();
      const result = generator.generate(schema);
      expect(result).toBe(result.toLowerCase());
    });

    it('uppercase check', () => {
      const schema = z.string().uppercase();
      const result = generator.generate(schema);
      expect(result).toBe(result.toUpperCase());
    });

    it('lowercase check', () => {
      const schema = z.string().lowercase();
      const result = generator.generate(schema);
      expect(result).toBe(result.toLowerCase());
    });

    it('multiple case checks - only last one applied', () => {
      const schema = z.string().uppercase().lowercase();
      const result = generator.generate(schema);
      expect(result).toBe(result.toLowerCase());
    });

    it('toUpperCase then startsWith', () => {
      const schema = z.string().toUpperCase().startsWith('PREFIX');
      const result = generator.generate(schema);
      const parseResult = schema.safeParse(result);
      expect(result.startsWith('PREFIX')).toBe(true);
      expect(parseResult.success).toBe(true);
    });

    it('startsWith then toUpperCase - validation succeeds', () => {
      const schema = z.string().startsWith('prefix').toUpperCase();
      const result = generator.generate(schema);
      const parseResult = schema.safeParse(result);
      expect(result.startsWith('prefix')).toBe(true);
      expect(parseResult.success).toBe(true);
    });
  });

  describe('Structural constraints', () => {
    it('startsWith and endsWith', () => {
      const schema = z.string().startsWith('A').endsWith('Z');
      const result = generator.generate(schema);
      expect(result.startsWith('A')).toBe(true);
      expect(result.endsWith('Z')).toBe(true);
    });

    it('startsWith, includes, and endsWith', () => {
      const schema = z.string().startsWith('A').includes('-').endsWith('Z');
      const result = generator.generate(schema);
      expect(result.startsWith('A')).toBe(true);
      expect(result).toContain('-');
      expect(result.endsWith('Z')).toBe(true);
    });

    it('multiple includes', () => {
      const schema = z.string().includes('A').includes('B').includes('C');
      const result = generator.generate(schema);
      expect(result).toContain('A');
      expect(result).toContain('B');
      expect(result).toContain('C');
    });
  });

  describe('Regex patterns', () => {
    it('simple regex pattern', () => {
      const schema = z.string().regex(/^[A-Z]+$/);
      const result = generator.generate(schema);
      expect(/^[A-Z]+$/.test(result)).toBe(true);
    });

    it('regex with length constraint', () => {
      const schema = z
        .string()
        .regex(/^[a-z]+$/)
        .length(5);
      const result = generator.generate(schema);
      expect(/^[a-z]+$/.test(result)).toBe(true);
    });
  });

  describe('Complex combinations', () => {
    it('length + startsWith + endsWith + includes', () => {
      const schema = z
        .string()
        .length(20)
        .startsWith('A')
        .endsWith('Z')
        .includes('-');
      const result = generator.generate(schema);
      expect(result.startsWith('A')).toBe(true);
      expect(result.endsWith('Z')).toBe(true);
      expect(result).toContain('-');
    });

    it('min/max + startsWith + includes', () => {
      const schema = z.string().min(10).max(20).startsWith('PRE').includes('X');
      const result = generator.generate(schema);
      expect(result.length).toBeGreaterThanOrEqual(10);
      expect(result.length).toBeLessThanOrEqual(20);
      expect(result.startsWith('PRE')).toBe(true);
      expect(result).toContain('X');
    });

    it('trim + toLowerCase + includes', () => {
      const schema = z.string().trim().toLowerCase().includes('test');
      const result = generator.generate(schema);
      expect(result).toBe(result.toLowerCase());
      expect(result).toContain('test');
    });

    it('regex + uppercase + startsWith - validation fails', () => {
      const schema = z
        .string()
        .regex(/^[a-z]+$/)
        .toUpperCase()
        .startsWith('TEST');
      const result = generator.generate(schema);
      const parseResult = schema.safeParse(result);
      expect(parseResult.success).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('empty string with constraints', () => {
      const schema = z.string().length(0).startsWith('').endsWith('');
      const result = generator.generate(schema);
      expect(result).toBe('');
    });

    it('conflicting length constraint - overlapping startsWith and endsWith', () => {
      const schema = z.string().length(4).startsWith('TEST').endsWith('TEST');
      const result = generator.generate(schema);
      const parseResult = schema.safeParse(result);
      expect(parseResult.success).toBe(false);
    });

    it('fixed length exceeds max constraint', () => {
      const schema = z.string().max(5).startsWith('ABCDEF');
      const result = generator.generate(schema);
      expect(result.startsWith('ABCDEF')).toBe(true);
    });

    it('very long includes chain', () => {
      const schema = z
        .string()
        .includes('A')
        .includes('B')
        .includes('C')
        .includes('D')
        .includes('E');
      const result = generator.generate(schema);
      expect(result).toContain('A');
      expect(result).toContain('B');
      expect(result).toContain('C');
      expect(result).toContain('D');
      expect(result).toContain('E');
    });
  });

  describe('Transformation order', () => {
    it('includes then startsWith order', () => {
      const schema = z.string().includes('B').startsWith('A');
      const result = generator.generate(schema);
      expect(result.startsWith('A')).toBe(true);
      expect(result).toContain('B');
    });

    it('endsWith then includes order', () => {
      const schema = z.string().endsWith('Z').includes('B');
      const result = generator.generate(schema);
      expect(result.endsWith('Z')).toBe(true);
      expect(result).toContain('B');
    });

    it('multiple transformations', () => {
      const schema = z.string().trim().toLowerCase().toUpperCase();
      const result = generator.generate(schema);
      expect(result).toBe(result.toUpperCase());
    });
  });

  describe('Overwrite transformations with structural constraints', () => {
    it('toLowerCase before startsWith - prefix not overwritten', () => {
      const schema = z.string().toLowerCase().startsWith('PREFIX');
      const result = generator.generate(schema);
      const parseResult = schema.safeParse(result);
      expect(result.startsWith('PREFIX')).toBe(true);
      expect(parseResult.success).toBe(false);
    });

    it('toUpperCase before endsWith - suffix not overwritten', () => {
      const schema = z.string().toUpperCase().endsWith('SUFFIX');
      const result = generator.generate(schema);
      const parseResult = schema.safeParse(result);
      expect(result.endsWith('SUFFIX')).toBe(true);
      expect(parseResult.success).toBe(true);
    });

    it('trim before startsWith and endsWith', () => {
      const schema = z.string().trim().startsWith('A').endsWith('Z');
      const result = generator.generate(schema);
      const parseResult = schema.safeParse(result);
      expect(result.startsWith('A')).toBe(true);
      expect(result.endsWith('Z')).toBe(true);
      expect(parseResult.success).toBe(true);
    });

    it('toLowerCase with startsWith and includes', () => {
      const schema = z
        .string()
        .toLowerCase()
        .startsWith('start')
        .includes('mid');
      const result = generator.generate(schema);
      const parseResult = schema.safeParse(result);
      expect(result.startsWith('start')).toBe(true);
      expect(result).toContain('mid');
      expect(parseResult.success).toBe(true);
    });

    it('toUpperCase with multiple structural constraints', () => {
      const schema = z
        .string()
        .toUpperCase()
        .startsWith('BEGIN')
        .includes('MIDDLE')
        .endsWith('END');
      const result = generator.generate(schema);
      const parseResult = schema.safeParse(result);
      expect(result.startsWith('BEGIN')).toBe(true);
      expect(result).toContain('MIDDLE');
      expect(result.endsWith('END')).toBe(true);
      expect(parseResult.success).toBe(true);
    });

    it('normalize before structural constraints', () => {
      const schema = z.string().normalize().startsWith('TEST');
      const result = generator.generate(schema);
      const parseResult = schema.safeParse(result);
      expect(result.startsWith('TEST')).toBe(true);
      expect(parseResult.success).toBe(true);
    });

    it('multiple overwrite checks with structural constraints', () => {
      const schema = z
        .string()
        .trim()
        .toLowerCase()
        .startsWith('prefix')
        .endsWith('suffix');
      const result = generator.generate(schema);
      const parseResult = schema.safeParse(result);
      expect(result.startsWith('prefix')).toBe(true);
      expect(result.endsWith('suffix')).toBe(true);
      expect(parseResult.success).toBe(true);
    });
  });
});
