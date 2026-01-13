import type { Faker } from '@faker-js/faker';
import { z } from 'zod';

/**
 * @package
 */
export function calcMinMaxString(
  minLength: number | null,
  maxLength: number | null,
) {
  if (typeof minLength === 'number') {
    if (maxLength === null) return { length: minLength };
    return { length: { min: minLength, max: maxLength } };
  }
  if (typeof maxLength === 'number') {
    if (minLength === null) return { length: maxLength };
    return { length: { min: minLength, max: maxLength } };
  }
  return { length: undefined };
}

/**
 * @package
 */
export function compareMin(leftMin: number | null, rightMin: number | null) {
  if (typeof leftMin === 'number' && typeof rightMin === 'number')
    return Math.max(leftMin, rightMin);
  if (typeof leftMin === 'number') return leftMin;
  if (typeof rightMin === 'number') return rightMin;
  return null;
}

/**
 * @package
 */
export function compareMax(leftMax: number | null, rightMax: number | null) {
  if (typeof leftMax === 'number' && typeof rightMax === 'number')
    return Math.min(leftMax, rightMax);
  if (typeof leftMax === 'number') return leftMax;
  if (typeof rightMax === 'number') return rightMax;
  return null;
}

/**
 * @package
 */
export function calcMinMaxInt(
  minValue: number | null,
  maxValue: number | null,
) {
  const min =
    minValue === -Infinity || minValue === null ? undefined : minValue;
  const max = maxValue === Infinity || maxValue === null ? undefined : maxValue;
  if (min === undefined && max !== undefined) return { min: max - 100, max };
  if (min !== undefined && max === undefined) return { min, max: min + 100 };
  return { min, max };
}

/**
 * @package
 */
export function calcMinMaxBigInt(
  minValue: bigint | null,
  maxValue: bigint | null,
) {
  const min = minValue === null ? undefined : minValue;
  const max = maxValue === null ? undefined : maxValue;
  if (min === undefined && max !== undefined) return { min: max - 100n, max };
  if (min !== undefined && max === undefined) return { min, max: min + 100n };
  return { min, max };
}

/**
 * @package
 */
export function calcMinMaxFloat(
  minValue: number | null,
  maxValue: number | null,
) {
  const min =
    minValue === null
      ? undefined
      : minValue === Number.MIN_VALUE
        ? Number.MIN_SAFE_INTEGER
        : minValue;
  const max =
    maxValue === null
      ? undefined
      : maxValue === Number.MAX_VALUE
        ? Number.MAX_SAFE_INTEGER
        : maxValue;
  if (min === undefined && max !== undefined) return { min: max - 100, max };
  if (min !== undefined && max === undefined) return { min, max: min + 100 };
  return { min, max };
}
/**
 * @package
 */
export function calcLengthFromChecks(
  checks: z.core.$ZodCheck<never>[],
  faker: Faker,
  config: { min: number; max: number },
): number {
  let { min, max } = config;

  for (const check of checks) {
    // Array checks (MinLength/MaxLength)
    if (check instanceof z.core.$ZodCheckMinLength) {
      min = Math.max(min, check._zod.def.minimum);
    }
    if (check instanceof z.core.$ZodCheckMaxLength) {
      max = Math.min(max, check._zod.def.maximum);
    }
    // Map/Set checks (MinSize/MaxSize)
    if (check instanceof z.core.$ZodCheckMinSize) {
      min = Math.max(min, check._zod.def.minimum);
    }
    if (check instanceof z.core.$ZodCheckMaxSize) {
      max = Math.min(max, check._zod.def.maximum);
    }
  }

  // Ensure min <= max (schema min may exceed config max)
  max = Math.max(min, max);

  return faker.number.int({ min, max });
}
