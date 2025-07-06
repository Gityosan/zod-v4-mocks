import { Faker } from '@faker-js/faker';
import { z } from 'zod/v4';
import type { MockConfig } from './type';
import { generators } from './util';

/**
 * @package
 */
export function generateFromSchema(
  schema: z.core.$ZodType,
  options: {
    faker: Faker;
    config: MockConfig;
    registry: z.core.$ZodRegistry<z.core.GlobalMeta> | null;
  },
): unknown {
  const { faker, config, registry } = options;
  if (registry?.has(schema)) {
    const meta = registry.get(schema);
    if (!meta?.consistentName) {
      // return generators.string(faker, schema);
    }
  }
  if (config.customGenerator) {
    return config.customGenerator(schema, options);
  }

  if (schema instanceof z.ZodEmail) return generators.email(faker);
  if (schema instanceof z.ZodURL) return generators.url(faker);
  if (schema instanceof z.ZodJWT) return generators.jwt(faker);
  if (schema instanceof z.ZodEmoji) return generators.emoji(faker);
  if (schema instanceof z.ZodIPv4) return generators.ipv4(faker);
  if (schema instanceof z.ZodIPv6) return generators.ipv6(faker);
  if (schema instanceof z.ZodCIDRv6) return generators.cidrv6();
  if (schema instanceof z.ZodBase64URL) return generators.base64url();
  if (schema instanceof z.ZodDate) return generators.date(faker);
  if (schema instanceof z.ZodISODateTime) return generators.isoDateTime(faker);
  if (schema instanceof z.ZodISODate) return generators.isoDate(faker);
  if (schema instanceof z.ZodISOTime) return generators.isoTime(faker);
  if (schema instanceof z.ZodISODuration) return generators.isoDuration(faker);

  if (schema instanceof z.ZodString) {
    const { def, format } = schema;
    if (format === 'email') return generators.email(faker);
    if (format === 'url') return generators.url(faker);
    if (format === 'jwt') return generators.jwt(faker);
    if (format === 'emoji') return generators.emoji(faker);
    if (format === 'ipv4') return generators.ipv4(faker);
    if (format === 'ipv6') return generators.ipv6(faker);
    if (format === 'cidrv6') return generators.cidrv6();
    if (format === 'base64url') return generators.base64url();
    if (format === 'datetime') return generators.isoDateTime(faker);
    if (format === 'date') return generators.isoDate(faker);
    if (format === 'time') return generators.isoTime(faker);
    if (format === 'duration') return generators.isoDuration(faker);

    const regexCheck = def.checks?.find((v) => 'pattern' in v._zod.def);
    if (regexCheck instanceof z.core.$ZodCheckStringFormat) {
      return generators.regex(faker, regexCheck);
    }
    return generators.string(faker, schema);
  }
  if (schema instanceof z.ZodBigInt) return generators.bigInt(faker, schema);

  if (schema instanceof z.ZodNumber) {
    if (schema instanceof z.ZodNumberFormat) {
      const { format } = schema;
      if (format === 'float32') return generators.float(faker, schema);
      if (format === 'float64') return generators.float(faker, schema);
    }
    return generators.int(faker, schema);
  }

  if (schema instanceof z.ZodFile) return generators.file();

  if (schema instanceof z.ZodArray) {
    const length = faker.number.int({
      min: config.minArrayLength,
      max: config.maxArrayLength,
    });
    return Array.from({ length }, () =>
      generateFromSchema(schema.element, options),
    );
  }

  if (schema instanceof z.ZodTuple) {
    const length = faker.number.int({
      min: config.minArrayLength,
      max: config.maxArrayLength,
    });
    return Array.from({ length }, () => {
      const randomOption = faker.helpers.arrayElement<z.core.$ZodType>(
        schema.def.items,
      );
      return generateFromSchema(randomOption, options);
    });
  }

  if (schema instanceof z.ZodObject) {
    const { shape } = schema;
    const result: { [key: string]: unknown } = {};

    for (const [key, value] of Object.entries(shape)) {
      result[key] = generateFromSchema(value, options);
    }
    return result;
  }

  if (schema instanceof z.ZodIntersection) {
    return generators.intersection(faker, schema, (schema) =>
      generateFromSchema(schema, options),
    );
  }

  if (schema instanceof z.ZodOptional) {
    if (faker.datatype.boolean({ probability: config.optionalProbability }))
      return undefined;
    return generateFromSchema(schema.unwrap(), options);
  }

  if (schema instanceof z.ZodNullable) {
    if (faker.datatype.boolean({ probability: config.nullableProbability }))
      return null;
    return generateFromSchema(schema.unwrap(), options);
  }

  if (schema instanceof z.ZodUnion) {
    const { options: items } = schema;
    const randomOption = faker.helpers.arrayElement<z.core.$ZodType>(items);
    return generateFromSchema(randomOption, options);
  }
  if (schema instanceof z.ZodRecord) {
    return generators.record(schema, (schema) =>
      generateFromSchema(schema, options),
    );
  }
  if (schema instanceof z.ZodMap) {
    return generators.map(schema, (schema) =>
      generateFromSchema(schema, options),
    );
  }
  if (schema instanceof z.ZodSet) {
    return generators.set(schema, (schema) =>
      generateFromSchema(schema, options),
    );
  }

  if (schema instanceof z.ZodNaN) return NaN;
  if (schema instanceof z.ZodBoolean) return faker.datatype.boolean();
  if (schema instanceof z.ZodLiteral) {
    return faker.helpers.arrayElement([...schema.values]);
  }
  if (schema instanceof z.ZodEnum) {
    return faker.helpers.arrayElement(schema.options);
  }
  if (schema instanceof z.ZodNull) return null;
  if (schema instanceof z.ZodUndefined) return undefined;
  if (schema instanceof z.ZodAny) return faker.lorem.word();
  if (schema instanceof z.ZodUnknown) return faker.lorem.word();
  if (schema instanceof z.ZodVoid) return undefined;
  if (schema instanceof z.ZodSymbol) return Symbol(faker.lorem.word());
  if (schema instanceof z.ZodDefault) {
    return generateFromSchema(schema.unwrap(), options);
  }
  if (schema instanceof z.ZodPrefault) {
    return generateFromSchema(schema.unwrap(), options);
  }
  if (schema instanceof z.ZodReadonly) {
    return generateFromSchema(schema.def.innerType, options);
  }
  if (schema instanceof z.ZodLazy) {
    return generateFromSchema(schema.unwrap(), options);
  }
  if (schema instanceof z.ZodPipe) {
    return generators.pipe(schema, (schema) =>
      generateFromSchema(schema, options),
    );
  }
  if (schema instanceof z.ZodTransform) {
    return generators.transform(schema);
  }

  if (schema instanceof z.ZodNever) {
    console.warn(
      'ZodNever schema encountered. Returning null for mock data as no valid value can exist.',
    );
    return null;
  }

  if (schema instanceof z.core.$ZodCheckStringFormat)
    return generators.regex(faker, schema);

  console.warn(
    `Unhandled Zod schema type: ${schema.constructor.name}. Returning dummy value.`,
  );
  return faker.lorem.word();
}
