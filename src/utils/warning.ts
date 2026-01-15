import { camelCase } from 'es-toolkit';
import { z } from 'zod';
import { isZodCheckStartsWith } from './schema';

export function warnMultipleChecks(
  checks: Record<string, string[] | number[]>,
) {
  for (const [name, values] of Object.entries(checks)) {
    if (values.length > 1) {
      console.warn(
        `Multiple ${name} checks detected: ${values.join(', ')}. Using the last one: ${values.at(-1)}. This may cause validation failures.`,
      );
    }
  }
}

export function warnFixedLengthExceedsConstraint(
  fixedLength: number,
  constraintType: 'length' | 'max',
  constraintValue: number,
) {
  console.warn(
    `Fixed length from startsWith/endsWith/includes (${fixedLength}) exceeds ${constraintType} constraint (${constraintValue}). Ignoring ${constraintType} constraint.`,
  );
}

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
