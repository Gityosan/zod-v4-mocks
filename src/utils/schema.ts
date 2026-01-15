import { z } from 'zod';

/**
 * @package
 */
export function unwrapSchema(schema: z.core.$ZodType) {
  if (schema instanceof z.ZodOptional) return schema.unwrap();
  if (schema instanceof z.ZodNullable) return schema.unwrap();
  if (schema instanceof z.ZodDefault) return schema.unwrap();
  if (schema instanceof z.ZodReadonly) return schema.unwrap();
  if (schema instanceof z.ZodLazy) return schema.unwrap();
  return schema;
}

/**
 * Check if a lazy schema is z.json()
 * z.json() returns a lazy union of [string, number, boolean, null, array(recursive), record(recursive)]
 */
export function isZodJsonSchema(
  lazySchema: z.ZodLazy,
  innerSchema: z.core.$ZodType,
): boolean {
  if (!(innerSchema instanceof z.ZodUnion)) return false;
  if (innerSchema.options.length !== 6) return false;

  const types = innerSchema.options;
  let found = 0;

  for (const type of types) {
    if (type instanceof z.ZodString) found |= 1;
    else if (type instanceof z.ZodNumber) found |= 2;
    else if (type instanceof z.ZodBoolean) found |= 4;
    else if (type instanceof z.ZodNull) found |= 8;
    else if (
      type instanceof z.ZodArray &&
      type.element instanceof z.ZodLazy &&
      type.element === lazySchema
    ) {
      found |= 16;
    } else if (
      type instanceof z.ZodRecord &&
      type.valueType instanceof z.ZodLazy &&
      type.valueType === lazySchema
    ) {
      found |= 32;
    }
  }

  return found === 63; // 1 + 2 + 4 + 8 + 16 + 32 = 63 (all bits set)
}

/**
 * Check if a codec schema is z.stringbool()
 * z.stringbool() is a codec that transforms between string and boolean
 */
export function isZodStringbool(schema: z.ZodCodec): boolean {
  return (
    schema.def.in instanceof z.ZodString &&
    schema.def.out instanceof z.ZodBoolean
  );
}

/**
 * Type guard for $ZodCheckOverwrite
 */
export function isZodCheckOverwrite<T>(
  check: z.core.$ZodCheck<T>,
): check is z.core.$ZodCheckOverwrite<T> {
  return check._zod.def.check === 'overwrite';
}
