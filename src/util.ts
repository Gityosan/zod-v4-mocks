import { Faker, LocaleDefinition, allLocales } from '@faker-js/faker';
import { randomBytes } from 'crypto';
import { intersection as intersectionES, merge } from 'es-toolkit';
import RandExp from 'randexp';
import { z } from 'zod/v4';
import type { LocaleType, MockConfig } from './type';

function calcMinMaxString(minLength: number | null, maxLength: number | null) {
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

function compareMin(leftMin: number | null, rightMin: number | null) {
  if (typeof leftMin === 'number' && typeof rightMin === 'number')
    return Math.max(leftMin, rightMin);
  if (typeof leftMin === 'number') return leftMin;
  if (typeof rightMin === 'number') return rightMin;
  return null;
}

function compareMax(leftMax: number | null, rightMax: number | null) {
  if (typeof leftMax === 'number' && typeof rightMax === 'number')
    return Math.min(leftMax, rightMax);
  if (typeof leftMax === 'number') return leftMax;
  if (typeof rightMax === 'number') return rightMax;
  return null;
}

function calcMinMaxInt(minValue: number | null, maxValue: number | null) {
  const min =
    minValue === -Infinity || minValue === null ? undefined : minValue;
  const max = maxValue === Infinity || maxValue === null ? undefined : maxValue;
  if (min === undefined && max !== undefined) return { min: max - 100, max };
  if (min !== undefined && max === undefined) return { min, max: min + 100 };
  return { min, max };
}
function calcMinMaxBigInt(minValue: bigint | null, maxValue: bigint | null) {
  const min = minValue === null ? undefined : minValue;
  const max = maxValue === null ? undefined : maxValue;
  if (min === undefined && max !== undefined) return { min: max - 100n, max };
  if (min !== undefined && max === undefined) return { min, max: min + 100n };
  return { min, max };
}
function calcMinMaxFloat(minValue: number | null, maxValue: number | null) {
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

function unwrapSchema(schema: z.core.$ZodType) {
  if (schema instanceof z.ZodOptional) return schema.unwrap();
  if (schema instanceof z.ZodNullable) return schema.unwrap();
  if (schema instanceof z.ZodDefault) return schema.unwrap();
  if (schema instanceof z.ZodReadonly) return schema.def.innerType;
  if (schema instanceof z.ZodLazy) return schema.unwrap();
  return schema;
}

/**
 * @package
 */
export const generators = {
  file: () => new File([], 'test.txt'),
  email: (faker: Faker) => faker.internet.email(),
  url: (faker: Faker) => faker.internet.url(),
  jwt: (faker: Faker) => faker.internet.jwt(),
  emoji: (faker: Faker) => faker.internet.emoji(),
  uuidv4: (faker: Faker) => faker.string.uuid(),
  nanoid: (faker: Faker) => faker.string.nanoid(),
  ulid: (faker: Faker) => faker.string.ulid(),
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
  string: (faker: Faker, schema: z.ZodString) => {
    const { minLength, maxLength } = schema;
    return faker.lorem.word(calcMinMaxString(minLength, maxLength));
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
  record: (
    schema: z.ZodRecord,
    generator: (schema: z.core.$ZodType) => unknown,
  ) => {
    const { keyType, valueType } = schema;
    const key = generator(keyType);
    const value = generator(valueType);
    if (
      typeof key === 'string' ||
      typeof key === 'number' ||
      typeof key === 'symbol'
    )
      return { [key]: value };
    throw new Error('Invalid record key type');
  },
  map: (schema: z.ZodMap, generator: (schema: z.core.$ZodType) => unknown) => {
    const { keyType, valueType } = schema;
    const key = generator(keyType);
    const value = generator(valueType);
    return new Map([[key, value]]);
  },
  set: (schema: z.ZodSet, generator: (schema: z.core.$ZodType) => unknown) => {
    const { valueType } = schema.def;
    const value = generator(valueType);
    return new Set([value]);
  },
  intersection: (
    faker: Faker,
    schema: z.ZodIntersection,
    generator: (schema: z.core.$ZodType) => unknown,
  ) => {
    const { left, right } = schema.def;

    const unwrappedLeft = unwrapSchema(left);
    const unwrappedRight = unwrapSchema(right);

    if (
      unwrappedLeft.constructor !== left.constructor ||
      unwrappedRight.constructor !== right.constructor
    ) {
      const intersected = z.intersection(unwrappedLeft, unwrappedRight);
      return generator(intersected);
    }

    if (left instanceof z.ZodAny || left instanceof z.ZodUnknown) {
      return generator(right);
    }

    if (right instanceof z.ZodAny || right instanceof z.ZodUnknown) {
      return generator(left);
    }

    if (left instanceof z.ZodMap && right instanceof z.ZodMap) {
      const { keyType: leftKeyType, valueType: leftValueType } = left;
      const { keyType: rightKeyType, valueType: rightValueType } = right;
      if (
        leftKeyType.constructor === rightKeyType.constructor &&
        leftValueType.constructor === rightValueType.constructor
      ) {
        const newMapSchema = z.map(rightKeyType, rightValueType);
        return generator(newMapSchema);
      }
      throw new Error('Incompatible Map types in intersection');
    }

    if (left instanceof z.ZodLiteral && right instanceof z.ZodLiteral) {
      const intersection = intersectionES([...left.values], [...right.values]);
      const mergedSchema = z.literal(intersection);
      return generator(mergedSchema);
    }

    if (left instanceof z.ZodSet && right instanceof z.ZodSet) {
      const { valueType: leftValueType } = left.def;
      const { valueType: rightValueType } = right.def;
      if (leftValueType.constructor === rightValueType.constructor) {
        const newSetSchema = z.set(rightValueType);
        return generator(newSetSchema);
      }
      throw new Error('Incompatible Set types in intersection');
    }

    if (left instanceof z.ZodString && right instanceof z.ZodString) {
      const min = compareMin(left.minLength, right.minLength);
      const max = compareMax(left.maxLength, right.maxLength);
      if (min === null) {
        if (max === null) return generator(z.string());
        return generator(z.string().max(max));
      }
      if (max === null) return generator(z.string().min(min));
      if (min > max) throw new Error('Min value should be less than max value');
      return generator(z.string().min(min).max(max));
    }

    if (left instanceof z.ZodNumber && right instanceof z.ZodNumber) {
      const min = Math.max(
        left.minValue ?? Number.MIN_SAFE_INTEGER,
        right.minValue ?? Number.MIN_SAFE_INTEGER,
      );
      const max = Math.min(
        left.maxValue ?? Number.MAX_SAFE_INTEGER,
        right.maxValue ?? Number.MAX_SAFE_INTEGER,
      );
      return generator(z.number().min(min).max(max));
    }

    if (left instanceof z.ZodBoolean && right instanceof z.ZodBoolean) {
      return generator(right);
    }

    if (left instanceof z.ZodDate && right instanceof z.ZodDate) {
      return generator(right);
    }

    if (left instanceof z.ZodBigInt && right instanceof z.ZodBigInt) {
      const leftMin = left.minValue ?? BigInt(Number.MIN_SAFE_INTEGER);
      const rightMin = right.minValue ?? BigInt(Number.MIN_SAFE_INTEGER);
      const leftMax = left.maxValue ?? BigInt(Number.MAX_SAFE_INTEGER);
      const rightMax = right.maxValue ?? BigInt(Number.MAX_SAFE_INTEGER);

      const min = leftMin > rightMin ? leftMin : rightMin;
      const max = leftMax < rightMax ? leftMax : rightMax;

      return generator(z.bigint().min(min).max(max));
    }

    if (left instanceof z.ZodEnum && right instanceof z.ZodEnum) {
      const commonOptions = intersectionES(left.options, right.options);

      if (commonOptions.length === 0) {
        throw new Error('No common values in enum intersection');
      }
      return faker.helpers.arrayElement(commonOptions);
    }

    if (left instanceof z.ZodUnion && right instanceof z.ZodUnion) {
      const { options: leftOptions } = left;
      const { options: rightOptions } = right;

      const commonTypes: z.ZodTypeAny[] = [];
      for (const leftOption of leftOptions) {
        for (const rightOption of rightOptions) {
          if (leftOption.constructor === rightOption.constructor) {
            const intersected = z.intersection(leftOption, rightOption);
            commonTypes.push(intersected);
          }
        }
      }
      if (commonTypes.length === 0) {
        throw new Error('No compatible types in union intersection');
      }
      const selectedType = faker.helpers.arrayElement(commonTypes);
      return generator(selectedType);
    }

    const leftResult = generator(left);
    const rightResult = generator(right);

    if (Array.isArray(leftResult) && Array.isArray(rightResult)) {
      return intersectionES(leftResult, rightResult);
    }
    if (
      typeof leftResult === 'object' &&
      leftResult !== null &&
      typeof rightResult === 'object' &&
      rightResult !== null
    ) {
      return merge(leftResult, rightResult);
    }

    const leftType = typeof leftResult;
    const rightType = typeof rightResult;

    if (leftType !== rightType) {
      throw new Error(
        `Incompatible types in intersection: ${leftType} & ${rightType}. Cannot create a value that satisfies both conditions.`,
      );
    }

    return rightResult;
  },
  pipe: (
    schema: z.ZodPipe,
    generator: (schema: z.core.$ZodType) => unknown,
  ) => {
    const { in: input, out } = schema;
    if (out instanceof z.ZodTransform) {
      const inputValue = generator(input);
      const ctx: z.core.ParsePayload = { value: inputValue, issues: [] };
      return out.def.transform(inputValue, ctx);
    }
    return generator(out);
  },
  transform: (schema: z.ZodTransform) => schema.def.transform,
};

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

/**
 * @package
 */
export function createMockConfig(config?: Partial<MockConfig>): MockConfig {
  const {
    seed = 1,
    minArrayLength = 1,
    maxArrayLength = 3,
    optionalProbability = 0.5,
    nullableProbability = 0.5,
    consistentName = 'name',
    ...rest
  } = config || {};
  return {
    seed,
    minArrayLength,
    maxArrayLength,
    optionalProbability,
    nullableProbability,
    consistentName,
    ...rest,
  };
}
