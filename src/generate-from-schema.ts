import { z } from 'zod/v4';
import type { GeneraterOptions } from './type';
import { generators } from './utils';

function generateFromSchema(
  schema: z.core.$ZodType,
  options: GeneraterOptions,
): unknown {
  const { faker } = options;
  if (schema instanceof z.ZodFile) return generators.file();
  if (schema instanceof z.ZodEmail) return generators.email(faker);
  if (schema instanceof z.ZodURL) return generators.url(faker);
  if (schema instanceof z.ZodJWT) return generators.jwt(faker);
  if (schema instanceof z.ZodEmoji) return generators.emoji(faker);
  if (schema instanceof z.ZodGUID) return generators.uuidv4(faker);
  if (schema instanceof z.ZodNanoID) return generators.nanoid(faker);
  if (schema instanceof z.ZodULID) return generators.ulid(faker);
  if (schema instanceof z.ZodIPv4) return generators.ipv4(faker);
  if (schema instanceof z.ZodIPv6) return generators.ipv6(faker);
  if (schema instanceof z.ZodCIDRv6) return generators.cidrv6(faker);
  if (schema instanceof z.ZodBase64URL) return generators.base64url(faker);
  if (schema instanceof z.ZodDate) return generators.date(faker);
  if (schema instanceof z.ZodISODateTime) return generators.isoDateTime(faker);
  if (schema instanceof z.ZodISODate) return generators.isoDate(faker);
  if (schema instanceof z.ZodISOTime) return generators.isoTime(faker);
  if (schema instanceof z.ZodISODuration) return generators.isoDuration(faker);

  if (schema instanceof z.ZodUUID) {
    const { def } = schema;
    if ('version' in def) {
      if (def.version === 'v6') return generators.regex(faker, schema);
      if (def.version === 'v7') return generators.regex(faker, schema);
    }
    return generators.uuidv4(faker);
  }

  if (
    schema instanceof z.ZodCUID ||
    schema instanceof z.ZodCUID2 ||
    schema instanceof z.ZodXID ||
    schema instanceof z.ZodKSUID ||
    schema instanceof z.ZodCIDRv4 ||
    schema instanceof z.ZodBase64 ||
    schema instanceof z.ZodE164
  ) {
    return generators.regex(faker, schema);
  }

  if (schema instanceof z.ZodCustomStringFormat) {
    return generators.regex(faker, schema);
  }

  if (schema instanceof z.ZodString) {
    const { def, format } = schema;
    const { checks } = def;
    let stringResult: unknown = generators.string(faker, schema);
    if (format === 'email') stringResult = generators.email(faker);
    else if (format === 'url') stringResult = generators.url(faker);
    else if (format === 'jwt') stringResult = generators.jwt(faker);
    else if (format === 'emoji') stringResult = generators.emoji(faker);
    else if (format === 'ipv4') stringResult = generators.ipv4(faker);
    else if (format === 'ipv6') stringResult = generators.ipv6(faker);
    else if (format === 'cidrv6') stringResult = generators.cidrv6(faker);
    else if (format === 'base64url') stringResult = generators.base64url(faker);
    else if (format === 'datetime') {
      stringResult = generators.isoDateTime(faker);
    } else if (format === 'date') stringResult = generators.isoDate(faker);
    else if (format === 'time') stringResult = generators.isoTime(faker);
    else if (format === 'duration') {
      stringResult = generators.isoDuration(faker);
    } else {
      const regexCheck = checks?.find((v) => 'pattern' in v._zod.def);
      if (regexCheck instanceof z.core.$ZodCheckStringFormat) {
        stringResult = generators.regex(faker, regexCheck);
      }
    }

    const overwriteChecks =
      checks?.filter((v) => v._zod.def.check === 'overwrite') ?? [];
    for (const check of overwriteChecks) {
      if (check instanceof z.core.$ZodCheckOverwrite) {
        const { tx } = check._zod.def;
        stringResult = tx(stringResult);
      }
    }

    return stringResult;
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

  if (schema instanceof z.ZodNaN) return NaN;
  if (schema instanceof z.ZodBoolean) return faker.datatype.boolean();
  if (schema instanceof z.ZodNull) return null;
  if (schema instanceof z.ZodUndefined) return undefined;
  if (schema instanceof z.ZodAny) return faker.lorem.word();
  if (schema instanceof z.ZodUnknown) return faker.lorem.word();
  if (schema instanceof z.ZodVoid) return undefined;
  if (schema instanceof z.ZodSymbol) return Symbol(faker.lorem.word());

  if (schema instanceof z.ZodLiteral) {
    return generators.literal(schema, options);
  }
  if (schema instanceof z.ZodTemplateLiteral) {
    return generators.templateLiteral(schema, options, generateMocks);
  }
  if (schema instanceof z.ZodEnum) {
    return generators.enum(schema, options);
  }
  if (schema instanceof z.ZodArray) {
    return generators.array(schema, options, generateMocks);
  }
  if (schema instanceof z.ZodTuple) {
    return generators.tuple(schema, options, generateMocks);
  }
  if (schema instanceof z.ZodObject) {
    return generators.object(schema, options, generateMocks);
  }
  if (schema instanceof z.ZodRecord) {
    return generators.record(schema, options, generateMocks);
  }
  if (schema instanceof z.ZodMap) {
    return generators.map(schema, options, generateMocks);
  }
  if (schema instanceof z.ZodSet) {
    return generators.set(schema, options, generateMocks);
  }
  if (schema instanceof z.ZodUnion) {
    return generators.union(schema, options, generateMocks);
  }
  if (schema instanceof z.ZodDiscriminatedUnion) {
    return generators.discriminatedUnion(schema, options, generateMocks);
  }
  if (schema instanceof z.ZodIntersection) {
    return generators.intersection(schema, options, generateMocks);
  }
  if (schema instanceof z.ZodOptional) {
    return generators.optional(schema, options, generateMocks);
  }
  if (schema instanceof z.ZodNullable) {
    return generators.nullable(schema, options, generateMocks);
  }
  if (schema instanceof z.ZodNonOptional) {
    return generators.nonoptional(schema, options, generateMocks);
  }
  if (schema instanceof z.ZodDefault || schema instanceof z.ZodPrefault) {
    return generators.default(schema);
  }
  if (schema instanceof z.ZodReadonly) {
    return generateMocks(schema.def.innerType, options);
  }
  if (schema instanceof z.ZodLazy) {
    return generators.lazy(schema, options, generateMocks);
  }
  // ZodPipe series
  if (schema instanceof z.ZodPipe) {
    return generators.pipe(schema, options, generateMocks);
  }
  if (schema instanceof z.ZodSuccess) {
    return generators.success(schema, options, generateMocks);
  }
  if (schema instanceof z.ZodCatch) {
    return generators.catch(schema, options, generateMocks);
  }

  if (schema instanceof z.ZodNever) {
    console.warn(
      'ZodNever schema encountered. Returning null for mock data as no valid value can exist.',
    );
    return null;
  }

  console.warn(
    `Unhandled Zod schema type: ${schema.constructor.name}. Returning dummy value.`,
  );
  return faker.lorem.word();
}

export function generateMocks(
  schema: z.core.$ZodType,
  options: GeneraterOptions,
): unknown {
  const {
    config,
    customGenerator,
    registry,
    valueStore,
    arrayIndexes,
    pinnedHierarchy,
  } = options;

  if ('meta' in schema && typeof schema.meta === 'function') {
    const meta = schema.meta();
    if (meta && config.consistentKey) {
      const consistentName = meta[config.consistentKey];
      if (typeof consistentName === 'string') {
        const lastIndex = arrayIndexes.length - 1;
        if (!pinnedHierarchy.has(consistentName) && lastIndex !== -1) {
          pinnedHierarchy.set(consistentName, lastIndex);
        }
      }
    }
  }

  if (config.consistentKey && registry?.has(schema)) {
    const consistentName = registry.get(schema)?.consistentName;
    if (typeof consistentName === 'string') {
      const pinnedHierarchyValue = pinnedHierarchy.get(consistentName);
      const values = valueStore?.get(consistentName);
      if (values && pinnedHierarchyValue !== undefined) {
        return values[arrayIndexes[pinnedHierarchyValue]];
      }
    }
  }

  if (customGenerator) {
    const res = customGenerator(schema, options);
    if (res !== undefined) return res;
  }

  return generateFromSchema(schema, options);
}
