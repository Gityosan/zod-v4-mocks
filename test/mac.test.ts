import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { initGenerator } from '../src/mock-generator';

describe('ZodMAC', () => {
  const generator = initGenerator({ seed: 12345 });

  it('generates valid MAC address', () => {
    const schema = z.mac();
    const result = generator.generate(schema);
    expect(typeof result).toBe('string');
    // MAC address format: XX:XX:XX:XX:XX:XX or XX-XX-XX-XX-XX-XX
    expect(result).toMatch(/^([0-9a-f]{2}[:-]){5}[0-9a-f]{2}$/i);
    const parseResult = schema.safeParse(result);
    expect(parseResult.success).toBe(true);
  });

  it('generates consistent MAC address with same seed', () => {
    const schema = z.mac();
    const gen1 = initGenerator({ seed: 999 });
    const gen2 = initGenerator({ seed: 999 });
    const result1 = gen1.generate(schema);
    const result2 = gen2.generate(schema);
    expect(result1).toBe(result2);
  });

  it('generates different MAC addresses with different seeds', () => {
    const schema = z.mac();
    const gen1 = initGenerator({ seed: 111 });
    const gen2 = initGenerator({ seed: 222 });
    const result1 = gen1.generate(schema);
    const result2 = gen2.generate(schema);
    expect(result1).not.toBe(result2);
  });

  it('works in objects', () => {
    const schema = z.object({
      deviceId: z.string(),
      macAddress: z.mac(),
    });
    const result = generator.generate(schema);
    expect(typeof result.deviceId).toBe('string');
    expect(typeof result.macAddress).toBe('string');
    expect(result.macAddress).toMatch(/^([0-9a-f]{2}[:-]){5}[0-9a-f]{2}$/i);
    const parseResult = schema.safeParse(result);
    expect(parseResult.success).toBe(true);
  });

  it('works in arrays', () => {
    const schema = z.array(z.mac()).min(3).max(5);
    const result = generator.generate(schema);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(3);
    expect(result.length).toBeLessThanOrEqual(5);
    result.forEach((mac) => {
      expect(typeof mac).toBe('string');
      expect(mac).toMatch(/^([0-9a-f]{2}[:-]){5}[0-9a-f]{2}$/i);
    });
    const parseResult = schema.safeParse(result);
    expect(parseResult.success).toBe(true);
  });
});
