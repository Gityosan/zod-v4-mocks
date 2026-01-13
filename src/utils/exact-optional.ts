import { z } from 'zod';
import type { CustomGeneratorType, GeneraterOptions } from '../type';

// Symbol used to indicate a key should be omitted (for exactOptional)
export const OMIT_SYMBOL = Symbol.for('zod-v4-mocks:omit');

export function regenInOmitSymbol(
  value: unknown,
  schema: z.core.$ZodType,
  options: GeneraterOptions,
  generator: CustomGeneratorType,
) {
  // If result is omit symbol, unwrap and regenerate the actual value
  if (
    value === OMIT_SYMBOL &&
    (schema instanceof z.ZodOptional || schema instanceof z.ZodExactOptional)
  ) {
    return generator(schema.unwrap(), options);
  }
  return value;
}
