import { z } from 'zod';
import type { CustomGeneratorType, GeneraterOptions } from '../type';
import { safeInstanceof } from './schema';

// Symbol used to indicate a key should be omitted (for exactOptional)
export const OMIT_SYMBOL: unique symbol = Symbol.for(
  'zod-v4-mocks:optional-key-omit',
);

export function regenerateIfOmitted(
  value: unknown,
  schema: z.core.$ZodType,
  options: GeneraterOptions,
  generator: CustomGeneratorType,
): unknown {
  // If result is omit symbol, unwrap and regenerate the actual value
  if (
    value === OMIT_SYMBOL &&
    (schema instanceof z.ZodOptional ||
      safeInstanceof(schema, z.ZodExactOptional))
  ) {
    return generator(schema.unwrap(), options);
  }
  return value;
}
