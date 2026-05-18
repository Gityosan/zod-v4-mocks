import type { Faker } from '@faker-js/faker';
import { z } from 'zod';
import { calcMinMaxString } from './calculation';
import { generateUtils as u } from './generator';
import {
  isZodCheckEndsWith,
  isZodCheckIncludes,
  isZodCheckLengthEquals,
  isZodCheckLowerCase,
  isZodCheckOverwrite,
  isZodCheckRegex,
  isZodCheckStartsWith,
  isZodCheckUpperCase,
} from './schema';
import { warnCaseMismatch, warnFixedLengthExceedsConstraint } from './warning';

export function generateStringWithChecks(
  faker: Faker,
  schema: z.ZodString,
): string {
  const { def } = schema;
  const { checks = [] } = def;

  const lengthEqualsChecks = checks.filter(isZodCheckLengthEquals);
  const startsWithChecks = checks.filter(isZodCheckStartsWith);
  const endsWithChecks = checks.filter(isZodCheckEndsWith);
  const includesChecks = checks.filter(isZodCheckIncludes);
  const regexChecks = checks.filter(isZodCheckRegex);

  // Multiple competing checks of the same kind are reported by the
  // pre-flight check; here we just apply the last one of each.
  const lengthEqualsCheck = lengthEqualsChecks.at(-1);
  const startsWithCheck = startsWithChecks.at(-1);
  const endsWithCheck = endsWithChecks.at(-1);

  const prefix = startsWithCheck?._zod.def.prefix || '';
  const suffix = endsWithCheck?._zod.def.suffix || '';
  const includesLength = includesChecks.reduce(
    (sum, check) => sum + check._zod.def.includes.length,
    0,
  );
  const fixedLength = prefix.length + suffix.length + includesLength;

  let res = '';
  if (lengthEqualsCheck) {
    const targetLength = lengthEqualsCheck._zod.def.length;
    const additionalLength = targetLength - fixedLength;
    if (additionalLength <= 0) {
      warnFixedLengthExceedsConstraint(fixedLength, 'length', targetLength);
    } else {
      res = u.string(faker, { length: additionalLength });
    }
  } else {
    const { minLength, maxLength } = schema;
    if (maxLength !== null && fixedLength > maxLength) {
      warnFixedLengthExceedsConstraint(fixedLength, 'max', maxLength);
    } else {
      const adjustedMinLength =
        minLength !== null ? Math.max(0, minLength - fixedLength) : null;
      const adjustedMaxLength =
        maxLength !== null ? Math.max(0, maxLength - fixedLength) : null;
      const options = calcMinMaxString(adjustedMinLength, adjustedMaxLength);
      res = u.string(faker, options);
    }
  }

  const regexCheck = regexChecks.at(-1);
  if (regexCheck) res = u.regex(faker, regexCheck);

  const caseChecks = checks.filter(
    (v) => isZodCheckUpperCase(v) || isZodCheckLowerCase(v),
  );
  const caseCheck = caseChecks.at(-1);
  if (caseCheck) res = u.regex(faker, caseCheck);

  const overwriteChecks = checks.filter(isZodCheckOverwrite);

  const overwriteFnStrings = overwriteChecks.map((c) =>
    c._zod.def.tx.toString(),
  );
  const hasToLowerCase =
    (caseCheck && isZodCheckLowerCase(caseCheck)) ||
    overwriteFnStrings.some((s) => s.includes('toLowerCase()'));
  const hasToUpperCase =
    (caseCheck && isZodCheckUpperCase(caseCheck)) ||
    overwriteFnStrings.some((s) => s.includes('toUpperCase()'));

  for (const check of overwriteChecks) {
    const { tx } = check._zod.def;
    res = tx(res);
  }

  warnCaseMismatch(hasToLowerCase, 'LowerCase', startsWithCheck);
  warnCaseMismatch(hasToLowerCase, 'LowerCase', endsWithCheck);
  warnCaseMismatch(hasToUpperCase, 'UpperCase', startsWithCheck);
  warnCaseMismatch(hasToUpperCase, 'UpperCase', endsWithCheck);

  for (const check of includesChecks) {
    res = res + check._zod.def.includes;
  }
  if (startsWithCheck) res = prefix + res;
  if (endsWithCheck) res = res + suffix;

  return res;
}
