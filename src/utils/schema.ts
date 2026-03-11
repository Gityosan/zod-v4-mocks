import { z } from 'zod';

/**
 * Safe instanceof check that returns false when the class doesn't exist
 * instead of throwing "Right-hand side of 'instanceof' is not an object".
 * This allows zod-v4-mocks to work with older Zod v4 versions that lack
 * ZodMAC (< 4.1.13), ZodCodec (< 4.1.0), ZodXor (< 4.2.0),
 * and ZodExactOptional (< 4.3.0).
 * @package
 */
export function safeInstanceof<
  V extends z.core.$ZodType | z.core.$ZodCheck<never>,
  T extends abstract new (...args: never[]) => V,
>(
  value: V,
  ctor: T | undefined,
): value is InstanceType<T> & V {
  return typeof ctor === 'function' && value instanceof ctor;
}

/**
 * @package
 */
export function unwrapSchema(schema: z.core.$ZodType) {
  if (safeInstanceof(schema, z.ZodOptional)) return schema.unwrap();
  if (safeInstanceof(schema, z.ZodNullable)) return schema.unwrap();
  if (safeInstanceof(schema, z.ZodDefault)) return schema.unwrap();
  if (safeInstanceof(schema, z.ZodReadonly)) return schema.unwrap();
  if (safeInstanceof(schema, z.ZodLazy)) return schema.unwrap();
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
  if (!safeInstanceof(innerSchema, z.ZodUnion)) return false;
  if (innerSchema.options.length !== 6) return false;

  const types = innerSchema.options;
  let found = 0;

  for (const type of types) {
    if (safeInstanceof(type, z.ZodString)) found |= 1;
    else if (safeInstanceof(type, z.ZodNumber)) found |= 2;
    else if (safeInstanceof(type, z.ZodBoolean)) found |= 4;
    else if (safeInstanceof(type, z.ZodNull)) found |= 8;
    else if (
      safeInstanceof(type, z.ZodArray) &&
      safeInstanceof(type.element, z.ZodLazy) &&
      type.element === lazySchema
    ) {
      found |= 16;
    } else if (
      safeInstanceof(type, z.ZodRecord) &&
      safeInstanceof(type.valueType, z.ZodLazy) &&
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
    safeInstanceof(schema.def.in, z.ZodString) &&
    safeInstanceof(schema.def.out, z.ZodBoolean)
  );
}

/**
 * @package
 */
export function isZodCheckOverwrite<T>(
  check: z.core.$ZodCheck<T>,
): check is z.core.$ZodCheckOverwrite<T> {
  return check._zod.def.check === 'overwrite';
}

function isZodCheckStringFormat(
  check: z.core.$ZodCheck<string>,
): check is z.core.$ZodCheckStringFormat {
  return check._zod.def.check === 'string_format';
}

/**
 * @package
 */
export function isZodCheckEmail(
  check: z.core.$ZodCheck<string>,
): check is z.ZodEmail {
  return isZodCheckStringFormat(check) && check._zod.def.format === 'email';
}

/**
 * @package
 */
export function isZodCheckRegex(
  check: z.core.$ZodCheck<string>,
): check is z.core.$ZodCheckRegex {
  return isZodCheckStringFormat(check) && check._zod.def.format === 'regex';
}

/**
 * @package
 */
export function isZodCheckUpperCase(
  check: z.core.$ZodCheck<string>,
): check is z.core.$ZodCheckUpperCase {
  return isZodCheckStringFormat(check) && check._zod.def.format === 'uppercase';
}

/**
 * @package
 */
export function isZodCheckLowerCase(
  check: z.core.$ZodCheck<string>,
): check is z.core.$ZodCheckLowerCase {
  return isZodCheckStringFormat(check) && check._zod.def.format === 'lowercase';
}

/**
 * @package
 */
export function isZodCheckStartsWith(
  check: z.core.$ZodCheck<string>,
): check is z.core.$ZodCheckStartsWith {
  return (
    isZodCheckStringFormat(check) && check._zod.def.format === 'starts_with'
  );
}

/**
 * @package
 */
export function isZodCheckEndsWith(
  check: z.core.$ZodCheck<string>,
): check is z.core.$ZodCheckEndsWith {
  return isZodCheckStringFormat(check) && check._zod.def.format === 'ends_with';
}

/**
 * @package
 */
export function isZodCheckIncludes(
  check: z.core.$ZodCheck<string>,
): check is z.core.$ZodCheckIncludes {
  return isZodCheckStringFormat(check) && check._zod.def.format === 'includes';
}

/**
 * @package
 */
export function isZodCheckLengthEquals(
  check: z.core.$ZodCheck<string>,
): check is z.core.$ZodCheckLengthEquals {
  return check._zod.def.check === 'length_equals';
}

function isZodCheckMultipleOf(
  check: z.core.$ZodCheck<never>,
): check is z.core.$ZodCheckMultipleOf {
  return check._zod.def.check === 'multiple_of';
}

/**
 * @package
 */
export function isZodCheckMultipleOfNumber(
  check: z.core.$ZodCheck<never>,
): check is z.core.$ZodCheckMultipleOf<number> {
  return (
    isZodCheckMultipleOf(check) && typeof check._zod.def.value === 'number'
  );
}

/**
 * @package
 */
export function isZodCheckMultipleOfBigInt(
  check: z.core.$ZodCheck<never>,
): check is z.core.$ZodCheckMultipleOf<bigint> {
  return (
    isZodCheckMultipleOf(check) && typeof check._zod.def.value === 'bigint'
  );
}
