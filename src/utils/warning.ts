import { camelCase } from 'es-toolkit';
import { z } from 'zod';
import { isZodCheckStartsWith } from './schema';

const seenWarnings = new WeakSet<object>();
/**
 * @package
 * Emit a warning at most once per (schema, key) pair within a process.
 */
export function warnOnceForSchema(
  schema: object,
  message: string,
): void {
  if (seenWarnings.has(schema)) return;
  seenWarnings.add(schema);
  console.warn(message);
}

/**
 * @package
 */
export function warnFixedLengthExceedsConstraint(
  fixedLength: number,
  constraintType: 'length' | 'max',
  constraintValue: number,
) {
  console.warn(
    `Fixed length from startsWith/endsWith/includes (${fixedLength}) exceeds ${constraintType} constraint (${constraintValue}). Ignoring ${constraintType} constraint.`,
  );
}

/**
 * @package
 */
export function warnCaseMismatch(
  hasCaseTransform: boolean,
  caseType: 'LowerCase' | 'UpperCase',
  structuralCheck:
    | z.core.$ZodCheckStartsWith
    | z.core.$ZodCheckEndsWith
    | undefined,
) {
  if (!hasCaseTransform || !structuralCheck) return;
  const pattern = caseType === 'LowerCase' ? /[A-Z]/ : /[a-z]/;
  const { format } = structuralCheck._zod.def;
  const text = isZodCheckStartsWith(structuralCheck)
    ? structuralCheck._zod.def.prefix
    : structuralCheck._zod.def.suffix;
  if (pattern.test(text)) {
    console.warn(
      `to${caseType}() check with ${camelCase(format)}('${text}') containing ${caseType.toLowerCase()} letters may cause validation failures.`,
    );
  }
}
