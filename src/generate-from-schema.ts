import { z } from 'zod';
import type { GeneraterOptions } from './type';
import {
  getEmptyValueForSchema,
  isCircularRefSchema,
  isZodCheckEmail,
  isZodJsonSchema,
  isZodStringbool,
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
  if (s instanceof z.ZodFile) return u.file();
  if (s instanceof z.ZodEmail) return u.email(f, s);
  if (s instanceof z.ZodURL) return u.url(f);
  if (s instanceof z.ZodJWT) return u.jwt(f);
  if (s instanceof z.ZodEmoji) return u.emoji(f);
  if (s instanceof z.ZodGUID) return u.uuidv4(f);
  if (s instanceof z.ZodNanoID) return u.nanoid(f);
  if (s instanceof z.ZodULID) return u.ulid(f);
  if (s instanceof z.ZodIPv4) return u.ipv4(f);
  if (s instanceof z.ZodIPv6) return u.ipv6(f);
  if (s instanceof z.ZodMAC) return u.mac(f);
  if (s instanceof z.ZodCIDRv6) return u.cidrv6(f);
  if (s instanceof z.ZodBase64URL) return u.base64url(f);
  if (s instanceof z.ZodDate) return u.date(f);
  if (s instanceof z.ZodISODateTime) return u.isoDateTime(f);
  if (s instanceof z.ZodISODate) return u.isoDate(f);
  if (s instanceof z.ZodISOTime) return u.isoTime(f);
  if (s instanceof z.ZodISODuration) return u.isoDuration(f);

  if (s instanceof z.ZodUUID) {
    const { def } = s;
    if ('version' in def && def.version !== 'v4') {
      return u.regex(f, s);
    }
    return u.uuidv4(f);
  }

  if (s instanceof z.ZodCUID) return u.regex(f, s);
  if (s instanceof z.ZodCUID2) return u.regex(f, s);
  if (s instanceof z.ZodXID) return u.regex(f, s);
  if (s instanceof z.ZodKSUID) return u.regex(f, s);
  if (s instanceof z.ZodCIDRv4) return u.regex(f, s);
  if (s instanceof z.ZodBase64) return u.regex(f, s);
  if (s instanceof z.ZodE164) return u.regex(f, s);

  if (s instanceof z.ZodCustomStringFormat) {
    if (s.format === 'hostname') return u.hostname(f);
    return u.regex(f, s);
  }

  if (s instanceof z.ZodString) {
    const { checks = [] } = s.def;

    const emailCheck = checks.find(isZodCheckEmail);
    if (emailCheck) return u.email(f, emailCheck);

    const urlSchema = checks.find((v) => v instanceof z.ZodURL);
    if (urlSchema) return u.url(f);

    const jwtSchema = checks.find((v) => v instanceof z.ZodJWT);
    if (jwtSchema) return u.jwt(f);

    const emojiSchema = checks.find((v) => v instanceof z.ZodEmoji);
    if (emojiSchema) return u.emoji(f);

    const guidSchema = checks.find((v) => v instanceof z.ZodGUID);
    if (guidSchema) return u.uuidv4(f);

    const uuidSchema = checks.find((v) => v instanceof z.ZodUUID);
    if (uuidSchema) {
      const { version } = uuidSchema?._zod.def;
      if (version === 'v4') return u.uuidv4(f);
      return u.regex(f, uuidSchema);
    }

    const nanoidSchema = checks.find((v) => v instanceof z.ZodNanoID);
    if (nanoidSchema) return u.nanoid(f);

    const ulidSchema = checks.find((v) => v instanceof z.ZodULID);
    if (ulidSchema) return u.ulid(f);

    const ipv4Schema = checks.find((v) => v instanceof z.ZodIPv4);
    if (ipv4Schema) return u.ipv4(f);

    const ipv6Schema = checks.find((v) => v instanceof z.ZodIPv6);
    if (ipv6Schema) return u.ipv6(f);

    const cidrv6Schema = checks.find((v) => v instanceof z.ZodCIDRv6);
    if (cidrv6Schema) return u.cidrv6(f);

    const base64urlSchema = checks.find((v) => v instanceof z.ZodBase64URL);
    if (base64urlSchema) return u.base64url(f);

    const isoDateTimeSchema = checks.find((v) => v instanceof z.ZodISODateTime);
    if (isoDateTimeSchema) return u.isoDateTime(f);

    const isoDateSchema = checks.find((v) => v instanceof z.ZodISODate);
    if (isoDateSchema) return u.isoDate(f);

    const isoTimeSchema = checks.find((v) => v instanceof z.ZodISOTime);
    if (isoTimeSchema) return u.isoTime(f);

    const isoDurationSchema = checks.find((v) => v instanceof z.ZodISODuration);
    if (isoDurationSchema) return u.isoDuration(f);

    const cuidSchema = checks.find((v) => v instanceof z.ZodCUID);
    if (cuidSchema) return u.regex(f, cuidSchema);

    const cuid2Schema = checks.find((v) => v instanceof z.ZodCUID2);
    if (cuid2Schema) return u.regex(f, cuid2Schema);

    const xidSchema = checks.find((v) => v instanceof z.ZodXID);
    if (xidSchema) return u.regex(f, xidSchema);

    const ksuidSchema = checks.find((v) => v instanceof z.ZodKSUID);
    if (ksuidSchema) return u.regex(f, ksuidSchema);

    const cidrv4Schema = checks.find((v) => v instanceof z.ZodCIDRv4);
    if (cidrv4Schema) return u.regex(f, cidrv4Schema);

    const base64Schema = checks.find((v) => v instanceof z.ZodBase64);
    if (base64Schema) return u.regex(f, base64Schema);

    const e164Schema = checks.find((v) => v instanceof z.ZodE164);
    if (e164Schema) return u.regex(f, e164Schema);

    return generateStringWithChecks(f, s);
  }
  if (s instanceof z.ZodBigInt) return u.bigInt(f, s);
  if (s instanceof z.ZodNumber) {
    if (s instanceof z.ZodNumberFormat) {
      const { format } = s;
      if (format === 'float32') return u.float(f, s);
      if (format === 'float64') return u.float(f, s);
    }
    return u.int(f, s);
  }

  if (s instanceof z.ZodNaN) return NaN;
  if (s instanceof z.ZodBoolean) return f.datatype.boolean();
  if (s instanceof z.ZodNull) return null;
  if (s instanceof z.ZodUndefined) return undefined;
  if (s instanceof z.ZodAny) return f.lorem.word();
  if (s instanceof z.ZodUnknown) return f.lorem.word();
  if (s instanceof z.ZodVoid) return undefined;
  if (s instanceof z.ZodSymbol) return Symbol(f.lorem.word());

  if (s instanceof z.ZodLiteral) return u.literal(s, o);
  if (s instanceof z.ZodEnum) return u.enum(s, o);
  if (s instanceof z.ZodTemplateLiteral) return u.templateLiteral(s, o, g);
  if (s instanceof z.ZodArray) return u.array(s, o, g);
  if (s instanceof z.ZodTuple) return u.tuple(s, o, g);
  if (s instanceof z.ZodObject) return u.object(s, o, g);
  if (s instanceof z.ZodRecord) return u.record(s, o, g);
  if (s instanceof z.ZodMap) return u.map(s, o, g);
  if (s instanceof z.ZodSet) return u.set(s, o, g);
  if (s instanceof z.ZodUnion) return u.union(s, o, g);
  if (s instanceof z.ZodDiscriminatedUnion)
    return u.discriminatedUnion(s, o, g);
  if (s instanceof z.ZodXor) return u.xor(s, o, g);
  if (s instanceof z.ZodIntersection) return u.intersection(s, o, g);

  if (s instanceof z.ZodOptional) return u.optional(s, o, g);
  if (s instanceof z.ZodExactOptional) return u.exactOptional(s, o, g);
  if (s instanceof z.ZodNullable) return u.nullable(s, o, g);
  if (s instanceof z.ZodNonOptional) return u.nonoptional(s, o, g);
  if (s instanceof z.ZodDefault) return u.default(s, o, g);
  if (s instanceof z.ZodPrefault) return u.default(s, o, g);
  if (s instanceof z.ZodReadonly) return g(s.unwrap(), o);
  if (s instanceof z.ZodLazy) {
    if (isZodJsonSchema(s, s.unwrap())) return u.json();
    return u.lazy(s, o, g);
  }
  if (s instanceof z.ZodCodec) {
    if (isZodStringbool(s)) return u.stringbool(s, o);
    return u.codec(s, o, g);
  }

  // ZodPipe series
  if (s instanceof z.ZodPipe) return u.pipe(s, o, g);
  if (s instanceof z.ZodSuccess) return u.success(s, o, g);
  if (s instanceof z.ZodCatch) return u.catch(s, o, g);

  if (s instanceof z.ZodNever) {
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
