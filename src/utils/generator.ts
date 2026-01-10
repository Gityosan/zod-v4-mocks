import type { Faker } from '@faker-js/faker';
import { intersection as intersectionES, merge } from 'es-toolkit';
import RandExp from 'randexp';
import { z } from 'zod';
import type { CustomGeneratorType, GeneraterOptions } from '../type';

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
    const { pattern } = check._zod.def;
    if (pattern !== undefined) {
      const randexp = new RandExp(pattern);
      randexp.randInt = (a: number, b: number) =>
        faker.number.int({ min: a, max: b });
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
  literal: (schema: z.ZodLiteral, options: GeneraterOptions) => {
    const { faker } = options;
    return faker.helpers.arrayElement([...schema.values]);
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
      const value = generator(v, options);
      if (value === undefined) return 'undefined';
      if (value === null) return 'null';
      if (typeof value === 'number') return value.toString();
      if (typeof value === 'bigint') return value.toString();
      if (typeof value === 'boolean') return value.toString();
      return value;
    });
    return result.join('');
  },
  enum: (schema: z.ZodEnum, options: GeneraterOptions) => {
    const { faker } = options;
    return faker.helpers.arrayElement(schema.options);
  },
  array: (
    schema: z.ZodArray,
    options: GeneraterOptions,
    generator: CustomGeneratorType,
  ) => {
    const { faker, config } = options;
    const length = faker.number.int(config.array);
    return Array.from({ length }, (_, arrayIndex) => {
      const arrayIndexes = [...options.arrayIndexes, arrayIndex];
      const path = [...(options.path ?? []), arrayIndex];
      const key = arrayIndex;
      return generator(schema.element, { ...options, arrayIndexes, path, key });
    });
  },
  tuple: (
    schema: z.ZodTuple,
    options: GeneraterOptions,
    generator: CustomGeneratorType,
  ) => {
    const { faker, config } = options;
    const length = faker.number.int(config.array);
    return Array.from({ length }, (_, arrayIndex) => {
      const randomOption = faker.helpers.arrayElement<z.core.$ZodType>(
        schema.def.items,
      );
      const arrayIndexes = [...options.arrayIndexes, arrayIndex];
      const path = [...(options.path ?? []), arrayIndex];
      const key = arrayIndex;
      return generator(randomOption, { ...options, arrayIndexes, path, key });
    });
  },
  map: (
    schema: z.ZodMap,
    options: GeneraterOptions,
    generator: CustomGeneratorType,
  ) => {
    const { faker, config } = options;
    const { keyType, valueType } = schema;
    const length = faker.number.int(config.map);
    return new Map(
      Array.from({ length }, () => {
        const k = generator(keyType, options);
        const childPath = [...(options.path ?? []), '(map)'];
        const value = generator(valueType, {
          ...options,
          key: '(map)',
          path: childPath,
        });
        return [k, value];
      }),
    );
  },
  set: (
    schema: z.ZodSet,
    options: GeneraterOptions,
    generator: CustomGeneratorType,
  ) => {
    const { faker, config } = options;
    const { valueType } = schema.def;
    const length = faker.number.int(config.set);
    return new Set(
      Array.from({ length }, (_, i) => {
        const path = [...(options.path ?? []), i];
        return generator(valueType, { ...options, key: i, path });
      }),
    );
  },
  object: (
    schema: z.ZodObject,
    options: GeneraterOptions,
    generator: CustomGeneratorType,
  ) => {
    const { shape } = schema;
    const result: { [key: string]: unknown } = {};
    const omitSymbol = Symbol.for('zod-v4-mocks:omit');

    for (const [key, value] of Object.entries(shape)) {
      const path = [...(options.path ?? []), key];
      const generated = generator(value, { ...options, key, path });
      // Skip keys that should be omitted (from exactOptional)
      if (generated !== omitSymbol) {
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
    return [...Array(length)].reduce((acc) => {
      const k = generator(keyType, options);
      const keyIsValid =
        typeof k === 'string' || typeof k === 'number' || typeof k === 'symbol';
      if (keyIsValid) {
        const keyStr = typeof k === 'symbol' ? String(k) : k;
        const path = [...(options.path ?? []), keyStr];
        const value = generator(valueType, { ...options, key: keyStr, path });
        return { ...acc, [keyStr]: value };
      }
      throw new Error('Invalid record key type');
    }, {});
  },
  union: (
    schema: z.ZodUnion,
    options: GeneraterOptions,
    generator: CustomGeneratorType,
  ) => {
    const { faker } = options;
    const randomOption = faker.helpers.arrayElement<z.core.$ZodType>(
      schema.options,
    );
    return generator(randomOption, options);
  },
  discriminatedUnion: (
    schema: z.ZodDiscriminatedUnion,
    options: GeneraterOptions,
    generator: CustomGeneratorType,
  ) => {
    const { faker } = options;
    const randomOption = faker.helpers.arrayElement<z.core.$ZodType>(
      schema.options,
    );
    return generator(randomOption, options);
  },
  xor: (
    schema: z.ZodXor,
    options: GeneraterOptions,
    generator: CustomGeneratorType,
  ) => {
    const { faker } = options;
    const allOptions = schema.options;

    // Shuffle options to try different ones if needed
    const shuffledIndices = faker.helpers.shuffle(
      allOptions.map((_, i) => i),
    );

    // Try each option until we find one that satisfies exactly one schema
    for (const selectedIndex of shuffledIndices) {
      const selectedOption = allOptions[selectedIndex];
      const value = generator(selectedOption, options);

      // Check that the value satisfies exactly one schema (the selected one)
      // and fails all other schemas
      const otherOptions = allOptions.filter((_, i) => i !== selectedIndex);
      const failsAllOthers = otherOptions.every((otherSchema) => {
        const result = (otherSchema as z.ZodType).safeParse(value);
        return !result.success;
      });

      if (failsAllOthers) {
        return value;
      }
    }

    // Fallback: if we couldn't find an exclusive value, just return from the first option
    const fallbackOption = faker.helpers.arrayElement<z.core.$ZodType>(
      allOptions,
    );
    return generator(fallbackOption, options);
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

    if (left instanceof z.ZodAny || left instanceof z.ZodUnknown) {
      return generator(right, options);
    }

    if (right instanceof z.ZodAny || right instanceof z.ZodUnknown) {
      return generator(left, options);
    }

    if (left instanceof z.ZodMap && right instanceof z.ZodMap) {
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

    if (left instanceof z.ZodLiteral && right instanceof z.ZodLiteral) {
      const intersection = intersectionES([...left.values], [...right.values]);
      const mergedSchema = z.literal(intersection);
      return generator(mergedSchema, options);
    }

    if (left instanceof z.ZodSet && right instanceof z.ZodSet) {
      const { valueType: leftValueType } = left.def;
      const { valueType: rightValueType } = right.def;
      if (leftValueType.constructor === rightValueType.constructor) {
        const newSetSchema = z.set(rightValueType);
        return generator(newSetSchema, options);
      }
      throw new Error('Incompatible Set types in intersection');
    }

    if (left instanceof z.ZodString && right instanceof z.ZodString) {
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

    if (left instanceof z.ZodNumber && right instanceof z.ZodNumber) {
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

    if (left instanceof z.ZodBoolean && right instanceof z.ZodBoolean) {
      return generator(right, options);
    }

    if (left instanceof z.ZodDate && right instanceof z.ZodDate) {
      return generator(right, options);
    }

    if (left instanceof z.ZodBigInt && right instanceof z.ZodBigInt) {
      const leftMin = left.minValue ?? BigInt(Number.MIN_SAFE_INTEGER);
      const rightMin = right.minValue ?? BigInt(Number.MIN_SAFE_INTEGER);
      const leftMax = left.maxValue ?? BigInt(Number.MAX_SAFE_INTEGER);
      const rightMax = right.maxValue ?? BigInt(Number.MAX_SAFE_INTEGER);

      const min = leftMin > rightMin ? leftMin : rightMin;
      const max = leftMax < rightMax ? leftMax : rightMax;

      return generator(z.bigint().min(min).max(max), options);
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
    if (faker.datatype.boolean({ probability })) return undefined;
    return generator(schema.unwrap(), options);
  },
  exactOptional: (
    schema: z.ZodExactOptional,
    options: GeneraterOptions,
    generator: CustomGeneratorType,
  ) => {
    // exactOptional allows key to be omitted but doesn't accept explicit undefined
    // For mock generation, we use Symbol to indicate "omit this key"
    // or generate the actual value
    const { faker, config } = options;
    const { optionalProbability: probability } = config;
    if (faker.datatype.boolean({ probability })) {
      // Return a special symbol to indicate this key should be omitted
      return Symbol.for('zod-v4-mocks:omit');
    }
    return generator(schema.unwrap(), options);
  },
  nonoptional: (
    schema: z.ZodNonOptional,
    options: GeneraterOptions,
    generator: CustomGeneratorType,
  ) => {
    let innerSchema = schema.unwrap();
    while (innerSchema instanceof z.ZodOptional) {
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
  default: (schema: z.ZodDefault | z.ZodPrefault) => {
    return schema.def.defaultValue;
  },
  lazy: (
    schema: z.ZodLazy,
    options: GeneraterOptions,
    generator: CustomGeneratorType,
  ) => {
    const { lazyDepth = 1, config } = options;
    const innerSchema = schema.unwrap();

    // for z.json
    if (innerSchema instanceof z.ZodUnion) {
      const unionTypes = innerSchema.options;
      const hasJsonTypes = unionTypes.some(
        (type) =>
          type instanceof z.ZodString ||
          type instanceof z.ZodNumber ||
          type instanceof z.ZodBoolean ||
          type instanceof z.ZodNull ||
          type instanceof z.ZodArray ||
          type instanceof z.ZodRecord,
      );

      if (hasJsonTypes && unionTypes.length >= 4) {
        return {};
      }
    }

    if (lazyDepth < config.lazyDepthLimit) {
      const newOptions = { ...options, lazyDepth: lazyDepth + 1 };
      return generator(innerSchema, newOptions);
    }
    if (innerSchema instanceof z.ZodObject) return {};
    if (innerSchema instanceof z.ZodRecord) return {};
    if (innerSchema instanceof z.ZodArray) return [];
    if (innerSchema instanceof z.ZodTuple) return [];
    if (innerSchema instanceof z.ZodMap) return new Map();
    if (innerSchema instanceof z.ZodSet) return new Set();
    throw new Error('Unsupported lazy schema type');
  },
  pipe: (
    schema: z.ZodPipe,
    options: GeneraterOptions,
    generator: CustomGeneratorType,
  ) => {
    const { in: input, out } = schema;
    if (input instanceof z.ZodTransform) {
      const inputValue = generator(out, options);
      const ctx: z.core.ParsePayload = { value: inputValue, issues: [] };
      return input.def.transform(inputValue, ctx);
    }
    if (out instanceof z.ZodTransform) {
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
    return generator(schema.def.innerType, options);
  },
  codec: (
    schema: z.ZodCodec,
    options: GeneraterOptions,
    generator: CustomGeneratorType,
  ) => {
    // for z.stringbool
    if (
      schema.def.in instanceof z.ZodString &&
      schema.def.out instanceof z.ZodBoolean
    ) {
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
      ];
      return options.faker.helpers.arrayElement(validValues);
    }

    return generator(schema.def.in, options);
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
};
