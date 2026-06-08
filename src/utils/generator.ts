import type { Faker } from '@faker-js/faker';
import { intersection as intersectionES, merge } from 'es-toolkit';
import RandExp from 'randexp';
import { z } from 'zod';
import type { CustomGeneratorType, GeneraterOptions } from '../type';
import {
  calcLengthFromChecks,
  calcMinMaxBigInt,
  calcMinMaxNumber,
  compareMax,
  compareMin,
} from './calculation';
import { OMIT_SYMBOL, regenerateIfOmitted } from './exact-optional';
import {
  type ChildStep,
  type PathSegment,
  PATH_INDEX_HARD_LIMIT,
  descendPathSupplies,
  findKeyInjections,
  findMaxLiteralIndex,
} from './path';
import {
  isZodCheckMultipleOfBigInt,
  isZodCheckMultipleOfNumber,
  safeInstanceof,
  unwrapSchema,
} from './schema';

/**
 * Build the child generation options for descending one level. Updates
 * `pathSupplies` and `keyMappingKey`, and `arrayIndexes` for indexed steps.
 */
function pushPathSegment(
  options: GeneraterOptions,
  step: ChildStep,
  keyMappingKey?: string,
): GeneraterOptions {
  const child: GeneraterOptions = {
    ...options,
    pathSupplies: descendPathSupplies(options.pathSupplies, step),
    keyMappingKey,
  };
  if (step.kind === 'arrayIndex' || step.kind === 'tupleIndex') {
    child.arrayIndexes = [...options.arrayIndexes, step.index];
  }
  return child;
}

/**
 * Descend into a record/map entry for `key` and generate its value.
 * `keyMapping` is fed the key only for named (literal/enum) string keys.
 */
function generateKeyedValue(
  options: GeneraterOptions,
  step:
    | { kind: 'mapKey'; key: unknown }
    | { kind: 'recordKey'; key: string | number | symbol },
  valueType: z.core.$ZodType,
  namedKeys: boolean,
  generator: CustomGeneratorType,
): unknown {
  const keyMappingKey =
    namedKeys && typeof step.key === 'string' ? step.key : undefined;
  return generator(valueType, pushPathSegment(options, step, keyMappingKey));
}

/**
 * Whether a record/map key type names its keys (so `keyMapping` may use
 * the key). Random `z.string()` / `z.number()` keys are excluded — mapping
 * on a randomly produced key name would be surprising and non-deterministic.
 */
function isNamedKeyType(keyType: z.core.$ZodType): boolean {
  if (safeInstanceof(keyType, z.ZodLiteral)) return true;
  if (safeInstanceof(keyType, z.ZodEnum)) return true;
  if (safeInstanceof(keyType, z.ZodUnion)) {
    return (keyType as z.ZodUnion).options.every((o) => isNamedKeyType(o));
  }
  return false;
}

function recordKeyTypeAccepts(
  keyType: z.core.$ZodType,
): (k: PathSegment) => boolean {
  return (k) => {
    const t = typeof k;
    if (safeInstanceof(keyType, z.ZodString)) return t === 'string';
    if (safeInstanceof(keyType, z.ZodNumber)) return t === 'number';
    if (safeInstanceof(keyType, z.ZodSymbol)) return t === 'symbol';
    if (safeInstanceof(keyType, z.ZodLiteral)) {
      const values = (keyType as z.ZodLiteral).values;
      return Array.from(values).includes(k as never);
    }
    if (safeInstanceof(keyType, z.ZodEnum)) {
      const opts = (keyType as z.ZodEnum).options;
      return opts.includes(k as never);
    }
    if (safeInstanceof(keyType, z.ZodUnion)) {
      const opts = (keyType as z.ZodUnion).options;
      return opts.some((o) => recordKeyTypeAccepts(o)(k));
    }
    // Permissive fallback: accept primitive matches.
    return t === 'string' || t === 'number' || t === 'symbol';
  };
}

const validValues = [
  'true',
  '1',
  'yes',
  'on',
  'y',
  'enabled',
  'false',
  '0',
  'no',
  'off',
  'n',
  'disabled',
] as const;

export type StringLengthOptions = {
  length?: number | { min: number; max: number };
};

export const generateUtils = {
  file: () => new File([], 'test.txt'),
  email: (faker: Faker, schema?: z.ZodEmail) => {
    const email = faker.internet.email();
    const pattern = schema?._zod.def.pattern;
    if (!pattern || pattern.test(email)) return email;
    const randexp = new RandExp(pattern);
    randexp.randInt = (a: number, b: number) =>
      faker.number.int({ min: a, max: b });
    return randexp.gen();
  },
  url: (faker: Faker) => faker.internet.url(),
  jwt: (faker: Faker) => faker.internet.jwt(),
  emoji: (faker: Faker) => faker.internet.emoji(),
  uuidv4: (faker: Faker) => faker.string.uuid(),
  nanoid: (faker: Faker) => faker.string.nanoid(),
  ulid: (faker: Faker) => faker.string.ulid(),
  ipv4: (faker: Faker) => faker.internet.ipv4(),
  ipv6: (faker: Faker) => faker.internet.ipv6(),
  mac: (faker: Faker) => faker.internet.mac(),
  date: (faker: Faker) => faker.date.anytime(),
  cidrv6: (faker: Faker) => {
    const randexp = new RandExp(
      /([0-9a-f]{1,4}:){7}[0-9a-f]{1,4}\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])/,
    );
    randexp.randInt = (a: number, b: number) =>
      faker.number.int({ min: a, max: b });
    return randexp.gen();
  },
  base64url: (faker: Faker) => faker.string.alphanumeric(22),
  isoDateTime: (faker: Faker) => faker.date.anytime().toISOString(),
  isoDate: (faker: Faker) => faker.date.anytime().toISOString().split('T')[0],
  isoTime: (faker: Faker) => faker.date.anytime().toISOString().slice(11, 19),
  isoDuration: (faker: Faker) => {
    const hours = faker.number.int({ min: 0, max: 23 });
    const minutes = faker.number.int({ min: 0, max: 59 });
    const seconds = faker.number.int({ min: 0, max: 59 });
    return `PT${hours}H${minutes}M${seconds}S`;
  },
  hostname: (faker: Faker) => faker.internet.domainName(),
  regex: (faker: Faker, check: z.core.$ZodCheckStringFormat) => {
    const { pattern, format } = check._zod.def;
    if (pattern !== undefined) {
      const randexp = new RandExp(pattern);
      randexp.randInt = (a: number, b: number) =>
        faker.number.int({ min: a, max: b });
      return randexp.gen();
    }
    console.warn(
      `z.stringFormat("${format}") has no regex pattern. Generating a random word instead. Consider providing a regex: z.stringFormat("${format}", /your-pattern/)`,
    );
    return faker.lorem.word();
  },
  string: (faker: Faker, options: StringLengthOptions) => {
    try {
      return faker.lorem.word(options);
    } catch {
      return faker.string.alpha(options);
    }
  },
  int: (faker: Faker, schema: z.ZodNumber) => {
    const { minValue, maxValue } = schema;
    const { min, max } = calcMinMaxNumber(minValue, maxValue);

    const { checks = [] } = schema.def;
    const multipleOfCheck = checks.find(isZodCheckMultipleOfNumber);
    const multipleOf = multipleOfCheck?._zod.def.value;

    return faker.number.int({ min, max, multipleOf });
  },
  bigInt: (faker: Faker, schema: z.ZodBigInt) => {
    const { minValue, maxValue } = schema;
    const { min, max } = calcMinMaxBigInt(minValue, maxValue);

    const { checks = [] } = schema.def;
    const multipleOfCheck = checks.find(isZodCheckMultipleOfBigInt);
    const multipleOf = multipleOfCheck?._zod.def.value;

    return faker.number.bigInt({ min, max, multipleOf });
  },
  float: (faker: Faker, schema: z.ZodFloat32 | z.ZodFloat64) => {
    const { minValue, maxValue } = schema;
    const { min, max } = calcMinMaxNumber(minValue, maxValue);

    const { checks = [] } = schema.def;
    const multipleOfCheck = checks.find(isZodCheckMultipleOfNumber);
    const multipleOf = multipleOfCheck?._zod.def.value;

    return faker.number.float({ min, max, multipleOf });
  },
  literal: (schema: z.ZodLiteral, options: GeneraterOptions) => {
    const { faker } = options;
    return faker.helpers.arrayElement([...schema.values]);
  },
  enum: (schema: z.ZodEnum, options: GeneraterOptions) => {
    const { faker } = options;
    return faker.helpers.arrayElement(schema.options);
  },
  templateLiteral: (
    schema: z.ZodTemplateLiteral,
    options: GeneraterOptions,
    generator: CustomGeneratorType,
  ) => {
    const parts = schema.def.parts.filter((v) => v !== undefined);
    const result = parts.map((v) => {
      if (v === null) return 'null';
      if (typeof v === 'string') return v;
      if (typeof v === 'number') return v.toString();
      if (typeof v === 'bigint') return v.toString();
      if (typeof v === 'boolean') return v.toString();
      let value = generator(v, options);
      value = regenerateIfOmitted(value, v, options, generator);
      if (value === undefined) return 'undefined';
      if (value === null) return 'null';
      if (typeof value === 'number') return value.toString();
      if (typeof value === 'bigint') return value.toString();
      if (typeof value === 'boolean') return value.toString();
      return value;
    });
    return result.join('');
  },
  array: (
    schema: z.ZodArray,
    options: GeneraterOptions,
    generator: CustomGeneratorType,
  ) => {
    const { faker, config } = options;
    const { checks = [] } = schema.def;

    let length = calcLengthFromChecks(checks, faker, config.array);
    const maxLiteralIdx = findMaxLiteralIndex(options.pathSupplies);
    if (maxLiteralIdx + 1 > length) {
      if (maxLiteralIdx + 1 > PATH_INDEX_HARD_LIMIT) {
        throw new Error(
          `supplyPath array index ${maxLiteralIdx} exceeds the hard limit ` +
            `of ${PATH_INDEX_HARD_LIMIT}. Check for a typo in the supplied path.`,
        );
      }
      length = maxLiteralIdx + 1;
    }
    return Array.from({ length }, (_, arrayIndex) => {
      const childOpts = pushPathSegment(options, {
        kind: 'arrayIndex',
        index: arrayIndex,
      });
      return generator(schema.element, childOpts);
    }).filter((v) => v !== OMIT_SYMBOL);
  },
  tuple: (
    schema: z.ZodTuple,
    options: GeneraterOptions,
    generator: CustomGeneratorType,
  ) => {
    const { items } = schema.def;
    const result = items.map((item, arrayIndex) => {
      const childOpts = pushPathSegment(options, {
        kind: 'tupleIndex',
        index: arrayIndex,
      });
      return generator(item, childOpts);
    });

    // Handle case where ZodNever returns OMIT_SYMBOL
    // However, since tuples have fixed length, warn if OMIT_SYMBOL is present
    if (result.includes(OMIT_SYMBOL)) {
      console.warn(
        'OMIT_SYMBOL found in tuple. Tuple has fixed length, so OMIT_SYMBOL cannot be filtered out. This may cause validation errors.',
      );
    }

    return result;
  },
  map: (
    schema: z.ZodMap,
    options: GeneraterOptions,
    generator: CustomGeneratorType,
  ) => {
    const { faker, config } = options;
    const { keyType, valueType } = schema;
    const { checks = [] } = schema.def;

    const length = calcLengthFromChecks(checks, faker, config.map);
    const namedKeys = isNamedKeyType(keyType);
    const entries: [unknown, unknown][] = [];
    const addEntry = (k: unknown) => {
      const v = generateKeyedValue(
        options,
        { kind: 'mapKey', key: k },
        valueType,
        namedKeys,
        generator,
      );
      if (v !== OMIT_SYMBOL) entries.push([k, v]);
    };
    for (let i = 0; i < length; i++) {
      const k = generator(keyType, options);
      if (k !== OMIT_SYMBOL) addEntry(k);
    }
    for (const k of findKeyInjections(
      options.pathSupplies,
      recordKeyTypeAccepts(keyType),
    )) {
      addEntry(k);
    }
    return new Map(entries);
  },
  set: (
    schema: z.ZodSet,
    options: GeneraterOptions,
    generator: CustomGeneratorType,
  ) => {
    const { faker, config } = options;
    const { valueType, checks = [] } = schema.def;

    const length = calcLengthFromChecks(checks, faker, config.set);
    const values = Array.from({ length }, () => {
      const childOpts = pushPathSegment(options, { kind: 'setItem' });
      return generator(valueType, childOpts);
    }).filter((v) => v !== OMIT_SYMBOL);
    return new Set(values);
  },
  object: (
    schema: z.ZodObject,
    options: GeneraterOptions,
    generator: CustomGeneratorType,
  ) => {
    const { shape } = schema;
    const result: { [key: string]: unknown } = {};

    for (const [key, value] of Object.entries(shape)) {
      const childOpts = pushPathSegment(
        options,
        { kind: 'objectKey', key },
        key,
      );
      const generated = generator(value, childOpts);
      if (generated !== OMIT_SYMBOL) {
        result[key] = generated;
      }
    }
    return result;
  },
  record: (
    schema: z.ZodRecord,
    options: GeneraterOptions,
    generator: CustomGeneratorType,
  ) => {
    const { faker, config } = options;
    const { keyType, valueType } = schema;
    const length = faker.number.int(config.record);
    const namedKeys = isNamedKeyType(keyType);
    const acc: Record<string | number | symbol, unknown> = {};
    const addEntry = (k: string | number | symbol) => {
      const value = generateKeyedValue(
        options,
        { kind: 'recordKey', key: k },
        valueType,
        namedKeys,
        generator,
      );
      if (value === OMIT_SYMBOL) return;
      acc[typeof k === 'symbol' ? String(k) : k] = value;
    };

    for (let i = 0; i < length; i++) {
      const k = generator(keyType, options);
      if (k === OMIT_SYMBOL) continue;
      if (
        typeof k !== 'string' &&
        typeof k !== 'number' &&
        typeof k !== 'symbol'
      ) {
        throw new Error(
          `A record key was generated as '${typeof k}', which cannot be an ` +
            'object key. When the key type carries a transform ' +
            '(e.g. z.record(z.string().transform(...), ...)), the transform ' +
            'must return a string, number, or symbol.',
        );
      }
      addEntry(k);
    }

    for (const k of findKeyInjections(
      options.pathSupplies,
      recordKeyTypeAccepts(keyType),
    )) {
      addEntry(k);
    }

    return acc;
  },
  union: (
    schema: z.ZodUnion,
    options: GeneraterOptions,
    generator: CustomGeneratorType,
  ) => {
    // An empty union (constructible since Zod 4.4.0) matches nothing — it is
    // `never` in disguise, so there is no value to produce. Mirror z.never().
    if (schema.options.length === 0) return OMIT_SYMBOL;
    const { faker } = options;
    const randomOption = faker.helpers.arrayElement(schema.options);
    const result = generator(randomOption, options);
    return regenerateIfOmitted(result, randomOption, options, generator);
  },
  discriminatedUnion: (
    schema: z.ZodDiscriminatedUnion,
    options: GeneraterOptions,
    generator: CustomGeneratorType,
  ) => {
    // Empty discriminated union — nothing to discriminate on. See `union`.
    if (schema.options.length === 0) return OMIT_SYMBOL;
    const { faker } = options;
    const randomOption = faker.helpers.arrayElement(schema.options);
    const result = generator(randomOption, options);
    return regenerateIfOmitted(result, randomOption, options, generator);
  },
  xor: (
    schema: z.ZodXor,
    options: GeneraterOptions,
    generator: CustomGeneratorType,
  ) => {
    // Empty XOR matches nothing — `never` in disguise. See `union`.
    if (schema.options.length === 0) return OMIT_SYMBOL;
    for (const selectedOption of schema.options) {
      let value = generator(selectedOption, options);
      value = regenerateIfOmitted(value, selectedOption, options, generator);

      const result = schema.safeParse(value);
      if (result.success) return value;
    }

    throw new Error(
      'Could not generate a value that satisfies exactly one schema in XOR. ' +
        'This may happen when schemas overlap (e.g., z.xor([z.string(), z.any()]))',
    );
  },
  intersection: (
    schema: z.ZodIntersection,
    options: GeneraterOptions,
    generator: CustomGeneratorType,
  ) => {
    const { faker } = options;
    const { left, right } = schema.def;

    const unwrappedLeft = unwrapSchema(left);
    const unwrappedRight = unwrapSchema(right);

    if (
      unwrappedLeft.constructor !== left.constructor ||
      unwrappedRight.constructor !== right.constructor
    ) {
      const intersected = z.intersection(unwrappedLeft, unwrappedRight);
      return generator(intersected, options);
    }

    if (safeInstanceof(left, z.ZodAny) || safeInstanceof(left, z.ZodUnknown)) {
      return generator(right, options);
    }

    if (safeInstanceof(right, z.ZodAny) || safeInstanceof(right, z.ZodUnknown)) {
      return generator(left, options);
    }

    if (safeInstanceof(left, z.ZodMap) && safeInstanceof(right, z.ZodMap)) {
      const { keyType: leftKeyType, valueType: leftValueType } = left;
      const { keyType: rightKeyType, valueType: rightValueType } = right;
      if (
        leftKeyType.constructor === rightKeyType.constructor &&
        leftValueType.constructor === rightValueType.constructor
      ) {
        const newMapSchema = z.map(rightKeyType, rightValueType);
        return generator(newMapSchema, options);
      }
      throw new Error('Incompatible Map types in intersection');
    }

    if (safeInstanceof(left, z.ZodLiteral) && safeInstanceof(right, z.ZodLiteral)) {
      const intersection = intersectionES([...left.values], [...right.values]);
      const mergedSchema = z.literal(intersection);
      return generator(mergedSchema, options);
    }

    if (safeInstanceof(left, z.ZodSet) && safeInstanceof(right, z.ZodSet)) {
      const { valueType: leftValueType } = left.def;
      const { valueType: rightValueType } = right.def;
      if (leftValueType.constructor === rightValueType.constructor) {
        const newSetSchema = z.set(rightValueType);
        return generator(newSetSchema, options);
      }
      throw new Error('Incompatible Set types in intersection');
    }

    if (safeInstanceof(left, z.ZodString) && safeInstanceof(right, z.ZodString)) {
      const min = compareMin(left.minLength, right.minLength);
      const max = compareMax(left.maxLength, right.maxLength);
      if (min === null) {
        if (max === null) return generator(z.string(), options);
        return generator(z.string().max(max), options);
      }
      if (max === null) return generator(z.string().min(min), options);
      if (min > max) throw new Error('Min value should be less than max value');
      return generator(z.string().min(min).max(max), options);
    }

    if (safeInstanceof(left, z.ZodNumber) && safeInstanceof(right, z.ZodNumber)) {
      const min = Math.max(
        left.minValue ?? Number.MIN_SAFE_INTEGER,
        right.minValue ?? Number.MIN_SAFE_INTEGER,
      );
      const max = Math.min(
        left.maxValue ?? Number.MAX_SAFE_INTEGER,
        right.maxValue ?? Number.MAX_SAFE_INTEGER,
      );
      return generator(z.number().min(min).max(max), options);
    }

    if (safeInstanceof(left, z.ZodBoolean) && safeInstanceof(right, z.ZodBoolean)) {
      return generator(right, options);
    }

    if (safeInstanceof(left, z.ZodDate) && safeInstanceof(right, z.ZodDate)) {
      return generator(right, options);
    }

    if (safeInstanceof(left, z.ZodBigInt) && safeInstanceof(right, z.ZodBigInt)) {
      const leftMin = left.minValue ?? BigInt(Number.MIN_SAFE_INTEGER);
      const rightMin = right.minValue ?? BigInt(Number.MIN_SAFE_INTEGER);
      const leftMax = left.maxValue ?? BigInt(Number.MAX_SAFE_INTEGER);
      const rightMax = right.maxValue ?? BigInt(Number.MAX_SAFE_INTEGER);

      const min = leftMin > rightMin ? leftMin : rightMin;
      const max = leftMax < rightMax ? leftMax : rightMax;

      return generator(z.bigint().min(min).max(max), options);
    }

    if (safeInstanceof(left, z.ZodEnum) && safeInstanceof(right, z.ZodEnum)) {
      const commonOptions = intersectionES(left.options, right.options);

      if (commonOptions.length === 0) {
        throw new Error('No common values in enum intersection');
      }
      return faker.helpers.arrayElement(commonOptions);
    }

    if (safeInstanceof(left, z.ZodUnion) && safeInstanceof(right, z.ZodUnion)) {
      const { options: leftOptions } = left;
      const { options: rightOptions } = right;

      const commonTypes: z.ZodType[] = [];
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
      return generator(selectedType, options);
    }

    const leftResult = generator(left, options);
    const rightResult = generator(right, options);

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
  optional: (
    schema: z.ZodOptional,
    options: GeneraterOptions,
    generator: CustomGeneratorType,
  ) => {
    const { faker, config } = options;
    const { optionalProbability: probability } = config;
    if (faker.datatype.boolean({ probability })) {
      if (faker.datatype.boolean({ probability: 0.5 })) return OMIT_SYMBOL;
      else return undefined;
    }
    return generator(schema.unwrap(), options);
  },
  exactOptional: (
    schema: z.ZodExactOptional,
    options: GeneraterOptions,
    generator: CustomGeneratorType,
  ) => {
    const { faker, config } = options;
    const { optionalProbability: probability } = config;
    if (faker.datatype.boolean({ probability })) {
      return OMIT_SYMBOL;
    }
    return generator(schema.unwrap(), options);
  },
  nonoptional: (
    schema: z.ZodNonOptional,
    options: GeneraterOptions,
    generator: CustomGeneratorType,
  ) => {
    let innerSchema = schema.unwrap();
    while (safeInstanceof(innerSchema, z.ZodOptional)) {
      innerSchema = innerSchema.unwrap();
    }
    return generator(innerSchema, options);
  },
  nullable: (
    schema: z.ZodNullable,
    options: GeneraterOptions,
    generator: CustomGeneratorType,
  ) => {
    const { faker, config } = options;
    const { nullableProbability: probability } = config;
    if (faker.datatype.boolean({ probability })) return null;
    return generator(schema.unwrap(), options);
  },
  default: (
    schema: z.ZodDefault | z.ZodPrefault,
    options: GeneraterOptions,
    generator: CustomGeneratorType,
  ) => {
    const { faker, config } = options;
    const { defaultProbability: probability } = config;
    if (faker.datatype.boolean({ probability })) {
      return schema.def.defaultValue;
    }
    return generator(schema.unwrap(), options);
  },
  lazy: (
    schema: z.ZodLazy,
    options: GeneraterOptions,
    generator: CustomGeneratorType,
  ) => {
    const innerSchema = schema.unwrap();
    return generator(innerSchema, options);
  },
  json: () => {
    return {};
  },
  codec: (
    schema: z.ZodCodec,
    options: GeneraterOptions,
    generator: CustomGeneratorType,
  ) => {
    return generator(schema.def.in, options);
  },
  stringbool: (schema: z.ZodCodec, options: GeneraterOptions) => {
    const { reverseTransform } = schema.def;
    if (reverseTransform) {
      const boolValue = options.faker.datatype.boolean();
      const ctx: z.core.ParsePayload = { value: boolValue, issues: [] };
      return reverseTransform(boolValue, ctx);
    }
    return options.faker.helpers.arrayElement(validValues);
  },
  pipe: (
    schema: z.ZodPipe,
    options: GeneraterOptions,
    generator: CustomGeneratorType,
  ) => {
    const { in: input, out } = schema;
    if (safeInstanceof(input, z.ZodTransform)) {
      const inputValue = generator(out, options);
      const ctx: z.core.ParsePayload = { value: inputValue, issues: [] };
      return input.def.transform(inputValue, ctx);
    }
    if (safeInstanceof(out, z.ZodTransform)) {
      const inputValue = generator(input, options);
      const ctx: z.core.ParsePayload = { value: inputValue, issues: [] };
      return out.def.transform(inputValue, ctx);
    }
    return generator(out, options);
  },
  success: (
    schema: z.ZodSuccess,
    options: GeneraterOptions,
    generator: CustomGeneratorType,
  ) => {
    return generator(schema.unwrap(), options);
  },
  catch: (
    schema: z.ZodCatch,
    options: GeneraterOptions,
    generator: CustomGeneratorType,
  ) => {
    const innerType = schema.unwrap();
    const value = generator(innerType, options);
    const parsedValue = schema.safeParse(value);
    return parsedValue.data;
  },
  never: () => {
    return OMIT_SYMBOL;
  },
};
