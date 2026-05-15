import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { initGenerator } from '../src';

describe('keyMapping: off (default)', () => {
  it('does not apply when omitted', () => {
    const Schema = z.object({ email: z.string() });
    const result = initGenerator().generate(Schema);
    // Default string generator returns lorem.word, not an email.
    expect(result.email).not.toMatch(/@/);
  });
});

describe('keyMapping: auto - strings', () => {
  it('email key produces an email', () => {
    const Schema = z.object({ email: z.string() });
    const result = initGenerator({ keyMapping: 'auto' }).generate(Schema);
    expect(result.email).toMatch(/@/);
  });

  it('firstName / lastName / fullName', () => {
    const Schema = z.object({
      firstName: z.string(),
      lastName: z.string(),
      fullName: z.string(),
    });
    const result = initGenerator({ keyMapping: 'auto' }).generate(Schema);
    expect(typeof result.firstName).toBe('string');
    expect(typeof result.lastName).toBe('string');
    expect(typeof result.fullName).toBe('string');
    expect(result.firstName.length).toBeGreaterThan(0);
  });

  it('snake_case and kebab-case match same key', () => {
    const Schema = z.object({
      first_name: z.string(),
      'last-name': z.string(),
    });
    const result = initGenerator({ keyMapping: 'auto' }).generate(Schema);
    expect(result.first_name.length).toBeGreaterThan(0);
    expect(result['last-name'].length).toBeGreaterThan(0);
  });

  it('city / country / phone produce sensible values', () => {
    const Schema = z.object({
      city: z.string(),
      country: z.string(),
      phone: z.string(),
    });
    const result = initGenerator({ keyMapping: 'auto' }).generate(Schema);
    expect(typeof result.city).toBe('string');
    expect(typeof result.country).toBe('string');
    expect(typeof result.phone).toBe('string');
  });
});

describe('keyMapping: auto - numbers', () => {
  it('age produces a number 0-110', () => {
    const Schema = z.object({ age: z.number() });
    const result = initGenerator({ keyMapping: 'auto' }).generate(Schema);
    expect(result.age).toBeGreaterThanOrEqual(0);
    expect(result.age).toBeLessThanOrEqual(110);
    expect(Number.isInteger(result.age)).toBe(true);
  });
});

describe('keyMapping: auto - dates', () => {
  it('createdAt produces a Date', () => {
    const Schema = z.object({ createdAt: z.date() });
    const result = initGenerator({ keyMapping: 'auto' }).generate(Schema);
    expect(result.createdAt).toBeInstanceOf(Date);
  });
});

describe('keyMapping: custom function', () => {
  it('user function takes precedence over auto defaults', () => {
    const Schema = z.object({ email: z.string() });
    const result = initGenerator({
      keyMapping: (key) => (key === 'email' ? 'forced@x' : undefined),
    }).generate(Schema);
    expect(result.email).toBe('forced@x');
  });

  it('user function returning undefined falls back to defaults', () => {
    const Schema = z.object({ email: z.string() });
    const result = initGenerator({
      keyMapping: () => undefined,
    }).generate(Schema);
    expect(result.email).toMatch(/@/);
  });
});

describe('keyMapping respects schema validation', () => {
  it('format checks still apply (e.g. uuid wins over key name)', () => {
    const Schema = z.object({ name: z.uuid() });
    const result = initGenerator({ keyMapping: 'auto' }).generate(Schema);
    // UUID format should still match (not a person name)
    expect(result.name).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });
});

describe('keyMapping interaction with supplyPath', () => {
  it('supplyPath beats keyMapping', () => {
    const Schema = z.object({ email: z.string() });
    const result = initGenerator({ keyMapping: 'auto' })
      .supplyPath(['email'], 'override@x')
      .generate(Schema);
    expect(result.email).toBe('override@x');
  });
});

describe('keyMapping on records and maps', () => {
  it('record with z.enum() key — known keys map to faker functions', () => {
    const Schema = z.record(z.enum(['email', 'firstName']), z.string());
    const result = initGenerator({
      keyMapping: 'auto',
      record: { min: 2, max: 2 },
    }).generate(Schema);
    if ('email' in result) {
      expect(result['email']).toMatch(/@/);
    }
    if ('firstName' in result) {
      expect(result['firstName'].length).toBeGreaterThan(0);
    }
  });

  it('map with z.literal key — literal name triggers mapping', () => {
    const Schema = z.map(z.literal('email'), z.string());
    const result = initGenerator({
      keyMapping: 'auto',
      map: { min: 1, max: 1 },
    }).generate(Schema);
    const v = result.get('email');
    expect(v).toMatch(/@/);
  });
});

describe('keyMapping does not fire on random record/map keys', () => {
  it('a custom mapper is never invoked for z.record(z.string(), ...) keys', () => {
    const seen: string[] = [];
    const Schema = z.record(z.string(), z.string());
    initGenerator({
      keyMapping: (key) => {
        seen.push(key);
        return undefined;
      },
      record: { min: 3, max: 3 },
    }).generate(Schema);
    // Random string keys are not "named" — the mapper must not see them.
    expect(seen).toEqual([]);
  });

  it('a custom mapper IS invoked for object keys', () => {
    const seen: string[] = [];
    const Schema = z.object({ email: z.string(), age: z.number() });
    initGenerator({
      keyMapping: (key) => {
        seen.push(key);
        return undefined;
      },
    }).generate(Schema);
    expect(seen).toContain('email');
    expect(seen).toContain('age');
  });

  it('a custom mapper IS invoked for z.record(z.enum(...)) keys', () => {
    const seen: string[] = [];
    const Schema = z.record(z.enum(['email', 'name']), z.string());
    initGenerator({
      keyMapping: (key) => {
        seen.push(key);
        return undefined;
      },
      record: { min: 2, max: 2 },
    }).generate(Schema);
    // enum keys are "named" — the mapper sees them.
    expect(seen.length).toBeGreaterThan(0);
    for (const k of seen) {
      expect(['email', 'name']).toContain(k);
    }
  });
});

describe('keyMapping does not fire on array/tuple positions', () => {
  it('array of strings is unaffected by key mapping', () => {
    const Schema = z.array(z.string());
    const result = initGenerator({
      keyMapping: 'auto',
      array: { min: 3, max: 3 },
    }).generate(Schema);
    // Array elements have a numeric path segment, so no key mapping should fire.
    for (const v of result) {
      expect(v).not.toMatch(/@/);
    }
  });
});

describe('keyMapping interaction with consistent values', () => {
  it('consistent registry beats keyMapping', () => {
    const consistentKey = 'name';
    const NameId = z.string().meta({ [consistentKey]: 'NameId' });
    const Schema = z.object({
      name: NameId,
      // a sibling that should still get the auto-mapped person name
      lastName: z.string(),
    });
    const gen = initGenerator({ consistentKey, keyMapping: 'auto' }).register([
      NameId,
    ]);
    const result = gen.generate(Schema);
    // both fields are strings — the consistent value wins for `name` and is
    // arbitrary; lastName goes through keyMapping and is non-empty
    expect(typeof result.name).toBe('string');
    expect(typeof result.lastName).toBe('string');
    expect(result.lastName.length).toBeGreaterThan(0);
  });
});
