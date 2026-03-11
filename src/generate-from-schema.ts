import { z } from 'zod';
import type { GeneraterOptions } from './type';
import {
  getEmptyValueForSchema,
  isCircularRefSchema,
  isZodCheckEmail,
  isZodJsonSchema,
  isZodStringbool,
  safeInstanceof,
  generateStringWithChecks,
  generateUtils as u,
} from './utils';

function generateFromSchema(
  schema: z.core.$ZodType,
  options: GeneraterOptions,
) {
  const s = schema;
  const o = options;
  const g = generateMocks;
  const { faker: f } = o;
  if (safeInstanceof(s, z.ZodFile)) return u.file();
  if (safeInstanceof(s, z.ZodEmail)) return u.email(f, s);
  if (safeInstanceof(s, z.ZodURL)) return u.url(f);
  if (safeInstanceof(s, z.ZodJWT)) return u.jwt(f);
  if (safeInstanceof(s, z.ZodEmoji)) return u.emoji(f);
  if (safeInstanceof(s, z.ZodGUID)) return u.uuidv4(f);
  if (safeInstanceof(s, z.ZodNanoID)) return u.nanoid(f);
  if (safeInstanceof(s, z.ZodULID)) return u.ulid(f);
  if (safeInstanceof(s, z.ZodIPv4)) return u.ipv4(f);
  if (safeInstanceof(s, z.ZodIPv6)) return u.ipv6(f);
  if (safeInstanceof(s, z.ZodMAC)) return u.mac(f);
  if (safeInstanceof(s, z.ZodCIDRv6)) return u.cidrv6(f);
  if (safeInstanceof(s, z.ZodBase64URL)) return u.base64url(f);
  if (safeInstanceof(s, z.ZodDate)) return u.date(f);
  if (safeInstanceof(s, z.ZodISODateTime)) return u.isoDateTime(f);
  if (safeInstanceof(s, z.ZodISODate)) return u.isoDate(f);
  if (safeInstanceof(s, z.ZodISOTime)) return u.isoTime(f);
  if (safeInstanceof(s, z.ZodISODuration)) return u.isoDuration(f);

  if (safeInstanceof(s, z.ZodUUID)) {
    const { def } = s;
    if ('version' in def && def.version !== 'v4') {
      return u.regex(f, s);
    }
    return u.uuidv4(f);
  }

  if (safeInstanceof(s, z.ZodCUID)) return u.regex(f, s);
  if (safeInstanceof(s, z.ZodCUID2)) return u.regex(f, s);
  if (safeInstanceof(s, z.ZodXID)) return u.regex(f, s);
  if (safeInstanceof(s, z.ZodKSUID)) return u.regex(f, s);
  if (safeInstanceof(s, z.ZodCIDRv4)) return u.regex(f, s);
  if (safeInstanceof(s, z.ZodBase64)) return u.regex(f, s);
  if (safeInstanceof(s, z.ZodE164)) return u.regex(f, s);

  if (safeInstanceof(s, z.ZodCustomStringFormat)) {
    if (s.format === 'hostname') return u.hostname(f);
    return u.regex(f, s);
  }

  if (safeInstanceof(s, z.ZodString)) {
    const { checks = [] } = s.def;

    const emailCheck = checks.find(isZodCheckEmail);
    if (emailCheck) return u.email(f, emailCheck);

    const urlSchema = checks.find((v) => safeInstanceof(v, z.ZodURL));
    if (urlSchema) return u.url(f);

    const jwtSchema = checks.find((v) => safeInstanceof(v, z.ZodJWT));
    if (jwtSchema) return u.jwt(f);

    const emojiSchema = checks.find((v) => safeInstanceof(v, z.ZodEmoji));
    if (emojiSchema) return u.emoji(f);

    const guidSchema = checks.find((v) => safeInstanceof(v, z.ZodGUID));
    if (guidSchema) return u.uuidv4(f);

    const uuidSchema = checks.find((v) => safeInstanceof(v, z.ZodUUID));
    if (uuidSchema) {
      const { version } = uuidSchema?._zod.def;
      if (version === 'v4') return u.uuidv4(f);
      return u.regex(f, uuidSchema);
    }

    const nanoidSchema = checks.find((v) => safeInstanceof(v, z.ZodNanoID));
    if (nanoidSchema) return u.nanoid(f);

    const ulidSchema = checks.find((v) => safeInstanceof(v, z.ZodULID));
    if (ulidSchema) return u.ulid(f);

    const ipv4Schema = checks.find((v) => safeInstanceof(v, z.ZodIPv4));
    if (ipv4Schema) return u.ipv4(f);

    const ipv6Schema = checks.find((v) => safeInstanceof(v, z.ZodIPv6));
    if (ipv6Schema) return u.ipv6(f);

    const cidrv6Schema = checks.find((v) => safeInstanceof(v, z.ZodCIDRv6));
    if (cidrv6Schema) return u.cidrv6(f);

    const base64urlSchema = checks.find((v) => safeInstanceof(v, z.ZodBase64URL));
    if (base64urlSchema) return u.base64url(f);

    const isoDateTimeSchema = checks.find((v) => safeInstanceof(v, z.ZodISODateTime));
    if (isoDateTimeSchema) return u.isoDateTime(f);

    const isoDateSchema = checks.find((v) => safeInstanceof(v, z.ZodISODate));
    if (isoDateSchema) return u.isoDate(f);

    const isoTimeSchema = checks.find((v) => safeInstanceof(v, z.ZodISOTime));
    if (isoTimeSchema) return u.isoTime(f);

    const isoDurationSchema = checks.find((v) => safeInstanceof(v, z.ZodISODuration));
    if (isoDurationSchema) return u.isoDuration(f);

    const cuidSchema = checks.find((v) => safeInstanceof(v, z.ZodCUID));
    if (cuidSchema) return u.regex(f, cuidSchema);

    const cuid2Schema = checks.find((v) => safeInstanceof(v, z.ZodCUID2));
    if (cuid2Schema) return u.regex(f, cuid2Schema);

    const xidSchema = checks.find((v) => safeInstanceof(v, z.ZodXID));
    if (xidSchema) return u.regex(f, xidSchema);

    const ksuidSchema = checks.find((v) => safeInstanceof(v, z.ZodKSUID));
    if (ksuidSchema) return u.regex(f, ksuidSchema);

    const cidrv4Schema = checks.find((v) => safeInstanceof(v, z.ZodCIDRv4));
    if (cidrv4Schema) return u.regex(f, cidrv4Schema);

    const base64Schema = checks.find((v) => safeInstanceof(v, z.ZodBase64));
    if (base64Schema) return u.regex(f, base64Schema);

    const e164Schema = checks.find((v) => safeInstanceof(v, z.ZodE164));
    if (e164Schema) return u.regex(f, e164Schema);

    return generateStringWithChecks(f, s);
  }
  if (safeInstanceof(s, z.ZodBigInt)) return u.bigInt(f, s);
  if (safeInstanceof(s, z.ZodNumber)) {
    if (safeInstanceof(s, z.ZodNumberFormat)) {
      const { format } = s;
      if (format === 'float32') return u.float(f, s);
      if (format === 'float64') return u.float(f, s);
    }
    return u.int(f, s);
  }

  if (safeInstanceof(s, z.ZodNaN)) return NaN;
  if (safeInstanceof(s, z.ZodBoolean)) return f.datatype.boolean();
  if (safeInstanceof(s, z.ZodNull)) return null;
  if (safeInstanceof(s, z.ZodUndefined)) return undefined;
  if (safeInstanceof(s, z.ZodAny)) return f.lorem.word();
  if (safeInstanceof(s, z.ZodUnknown)) return f.lorem.word();
  if (safeInstanceof(s, z.ZodVoid)) return undefined;
  if (safeInstanceof(s, z.ZodSymbol)) return Symbol(f.lorem.word());

  if (safeInstanceof(s, z.ZodLiteral)) return u.literal(s, o);
  if (safeInstanceof(s, z.ZodEnum)) return u.enum(s, o);
  if (safeInstanceof(s, z.ZodTemplateLiteral)) return u.templateLiteral(s, o, g);
  if (safeInstanceof(s, z.ZodArray)) return u.array(s, o, g);
  if (safeInstanceof(s, z.ZodTuple)) return u.tuple(s, o, g);
  if (safeInstanceof(s, z.ZodObject)) return u.object(s, o, g);
  if (safeInstanceof(s, z.ZodRecord)) return u.record(s, o, g);
  if (safeInstanceof(s, z.ZodMap)) return u.map(s, o, g);
  if (safeInstanceof(s, z.ZodSet)) return u.set(s, o, g);
  if (safeInstanceof(s, z.ZodUnion)) return u.union(s, o, g);
  if (safeInstanceof(s, z.ZodDiscriminatedUnion))
    return u.discriminatedUnion(s, o, g);
  if (safeInstanceof(s, z.ZodXor)) return u.xor(s, o, g);
  if (safeInstanceof(s, z.ZodIntersection)) return u.intersection(s, o, g);

  if (safeInstanceof(s, z.ZodOptional)) return u.optional(s, o, g);
  if (safeInstanceof(s, z.ZodExactOptional)) return u.exactOptional(s, o, g);
  if (safeInstanceof(s, z.ZodNullable)) return u.nullable(s, o, g);
  if (safeInstanceof(s, z.ZodNonOptional)) return u.nonoptional(s, o, g);
  if (safeInstanceof(s, z.ZodDefault)) return u.default(s, o, g);
  if (safeInstanceof(s, z.ZodPrefault)) return u.default(s, o, g);
  if (safeInstanceof(s, z.ZodReadonly)) return g(s.unwrap(), o);
  if (safeInstanceof(s, z.ZodLazy)) {
    if (isZodJsonSchema(s, s.unwrap())) return u.json();
    return u.lazy(s, o, g);
  }
  if (safeInstanceof(s, z.ZodCodec)) {
    if (isZodStringbool(s)) return u.stringbool(s, o);
    return u.codec(s, o, g);
  }

  // ZodPipe series
  if (safeInstanceof(s, z.ZodPipe)) return u.pipe(s, o, g);
  if (safeInstanceof(s, z.ZodSuccess)) return u.success(s, o, g);
  if (safeInstanceof(s, z.ZodCatch)) return u.catch(s, o, g);

  if (safeInstanceof(s, z.ZodNever)) {
    return u.never();
  }

  console.warn(
    `Unhandled Zod s type: ${s.constructor.name}. Returning dummy value.`,
  );
  return f.lorem.word();
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

  if (isCircularRefSchema(schema)) {
    const { circularRefs } = options;
    const depth = circularRefs.get(schema) ?? 1;
    if (depth >= (config.recursiveDepthLimit ?? config.lazyDepthLimit)) {
      return getEmptyValueForSchema(schema);
    }
    const newCircularRefs = new Map(circularRefs);
    newCircularRefs.set(schema, depth + 1);
    return generateFromSchema(schema, { ...options, circularRefs: newCircularRefs });
  }

  return generateFromSchema(schema, options);
}
