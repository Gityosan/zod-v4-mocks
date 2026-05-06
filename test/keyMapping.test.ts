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
