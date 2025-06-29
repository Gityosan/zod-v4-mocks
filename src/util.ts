import { Faker, LocaleDefinition, allLocales } from '@faker-js/faker';
import { randomBytes } from 'crypto';
import RandExp from 'randexp';
import { z } from 'zod/v4';

function calcMinMaxInt(minValue: number | null, maxValue: number | null) {
  let min = minValue === -Infinity || minValue === null ? undefined : minValue;
  let max = maxValue === Infinity || maxValue === null ? undefined : maxValue;
  if (min === undefined && max !== undefined) return { min: max - 100, max };
  if (min !== undefined && max === undefined) return { min, max: min + 100 };
  return { min, max };
}
function calcMinMaxBigInt(minValue: bigint | null, maxValue: bigint | null) {
  let min = minValue === null ? undefined : minValue;
  let max = maxValue === null ? undefined : maxValue;
  if (min === undefined && max !== undefined) return { min: max - 100n, max };
  if (min !== undefined && max === undefined) return { min, max: min + 100n };
  return { min, max };
}
function calcMinMaxFloat(minValue: number | null, maxValue: number | null) {
  let min =
    minValue === null
      ? undefined
      : minValue === Number.MIN_VALUE
        ? Number.MIN_SAFE_INTEGER
        : minValue;
  let max =
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
export const generators = {
  email: (faker: Faker) => faker.internet.email(),
  url: (faker: Faker) => faker.internet.url(),
  jwt: (faker: Faker) => faker.internet.jwt(),
  emoji: (faker: Faker) => faker.internet.emoji(),
  ipv4: (faker: Faker) => faker.internet.ipv4(),
  ipv6: (faker: Faker) => faker.internet.ipv6(),
  date: (faker: Faker) => faker.date.anytime(),
  cidrv6: () => {
    return new RandExp(
      /([0-9a-f]{1,4}:){7}[0-9a-f]{1,4}\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])/,
    ).gen();
  },
  base64url: () => randomBytes(16).toString('base64url'),
  isoDateTime: (faker: Faker) => faker.date.anytime().toISOString(),
  isoDate: (faker: Faker) => faker.date.anytime().toISOString().split('T')[0],
  isoTime: (faker: Faker) => faker.date.anytime().toISOString().slice(11, 19),
  isoDuration: (faker: Faker) => {
    const hours = faker.number.int({ min: 0, max: 23 });
    const minutes = faker.number.int({ min: 0, max: 59 });
    const seconds = faker.number.int({ min: 0, max: 59 });
    return `PT${hours}H${minutes}M${seconds}S`;
  },
  regex: (faker: Faker, check: z.core.$ZodCheckStringFormat) => {
    const { pattern } = check._zod.def;
    if (pattern !== undefined) {
      const randexp = new RandExp(pattern);
      return randexp.gen();
    }
    return faker.lorem.word();
  },
  int: (faker: Faker, schema: z.ZodNumber) => {
    const { minValue, maxValue } = schema;
    const { min, max } = calcMinMaxInt(minValue, maxValue);
    if (min !== undefined && max !== undefined) {
      if (min > max) {
        throw new Error('Min value should be less than max value');
      }
    }
    return faker.number.int({ min, max });
  },
  bigInt: (faker: Faker, schema: z.ZodBigInt) => {
    const { minValue, maxValue } = schema;
    const { min, max } = calcMinMaxBigInt(minValue, maxValue);
    if (min !== undefined && max !== undefined) {
      if (min > max) {
        throw new Error('Min value should be less than max value');
      }
    }
    return faker.number.bigInt({ min, max });
  },
  float: (faker: Faker, schema: z.ZodFloat32 | z.ZodFloat64) => {
    const { minValue, maxValue } = schema;
    const { min, max } = calcMinMaxFloat(minValue, maxValue);
    if (min !== undefined && max !== undefined) {
      if (min > max) {
        throw new Error('Min value should be less than max value');
      }
    }
    return faker.number.float({ min, max });
  },
  file: () => new File([], 'test.txt'),
};

/**
 * @package
 */
export type LocaleType = keyof typeof allLocales;

/**
 * @package
 */
export function getLocales(
  locales?: LocaleType | LocaleType[],
): LocaleDefinition[] {
  const defaultLocales = [allLocales.en, allLocales.base];
  if (!locales) return defaultLocales;
  const localesArray = Array.isArray(locales) ? locales : [locales];
  return [
    ...new Set([
      ...localesArray.map((locale) => allLocales[locale]),
      ...defaultLocales,
    ]),
  ];
}
