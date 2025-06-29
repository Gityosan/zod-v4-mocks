import { Faker, type Randomizer } from '@faker-js/faker';
import { z } from 'zod/v4';
import { generators, getLocales, type LocaleType } from './util';

export interface MockConfig {
  locale?: LocaleType | LocaleType[];
  randomizer?: Randomizer;
  seed?: number;
  minArrayLength?: number;
  maxArrayLength?: number;
  optionalProbability?: number;
  nullableProbability?: number;
  customGenerator?: (faker: Faker, schema: z.core.$ZodType) => unknown;
}

export class ZodMockGenerator {
  private faker: Faker;
  private minArrayLength: number;
  private maxArrayLength: number;
  private optionalProbability: number;
  private nullableProbability: number;
  private customGenerator?: (faker: Faker, schema: z.core.$ZodType) => unknown;

  constructor(config: MockConfig) {
    this.faker = new Faker({
      locale: getLocales(config.locale),
      randomizer: config.randomizer,
      seed: config.seed,
    });
    this.minArrayLength = config.minArrayLength ?? 1;
    this.maxArrayLength = config.maxArrayLength ?? 3;
    this.optionalProbability = config.optionalProbability ?? 0.5;
    this.nullableProbability = config.nullableProbability ?? 0.5;
    this.customGenerator = config.customGenerator;
  }

  generate(schema: z.core.$ZodType): unknown {
    return this.generateFromSchema(schema);
  }

  private generateFromSchema(schema: z.core.$ZodType): unknown {
    if (this.customGenerator) {
      return this.customGenerator(this.faker, schema);
    }

    if (schema instanceof z.ZodEmail) return generators.email(this.faker);
    if (schema instanceof z.ZodURL) return generators.url(this.faker);
    if (schema instanceof z.ZodJWT) return generators.jwt(this.faker);
    if (schema instanceof z.ZodEmoji) return generators.emoji(this.faker);
    if (schema instanceof z.ZodIPv4) return generators.ipv4(this.faker);
    if (schema instanceof z.ZodIPv6) return generators.ipv6(this.faker);
    if (schema instanceof z.ZodCIDRv6) return generators.cidrv6();
    if (schema instanceof z.ZodBase64URL) return generators.base64url();
    if (schema instanceof z.ZodDate) return generators.date(this.faker);
    if (schema instanceof z.ZodISODateTime)
      return generators.isoDateTime(this.faker);
    if (schema instanceof z.ZodISODate) return generators.isoDate(this.faker);
    if (schema instanceof z.ZodISOTime) return generators.isoTime(this.faker);
    if (schema instanceof z.ZodISODuration)
      return generators.isoDuration(this.faker);

    if (schema instanceof z.ZodString) {
      const { def, format } = schema;
      if (format === 'email') return generators.email(this.faker);
      if (format === 'url') return generators.url(this.faker);
      if (format === 'jwt') return generators.jwt(this.faker);
      if (format === 'emoji') return generators.emoji(this.faker);
      if (format === 'ipv4') return generators.ipv4(this.faker);
      if (format === 'ipv6') return generators.ipv6(this.faker);
      if (format === 'cidrv6') return generators.cidrv6();
      if (format === 'base64url') return generators.base64url();
      if (format === 'datetime') return generators.isoDateTime(this.faker);
      if (format === 'date') return generators.isoDate(this.faker);
      if (format === 'time') return generators.isoTime(this.faker);
      if (format === 'duration') return generators.isoDuration(this.faker);

      const regexCheck = def.checks?.find((v) => 'pattern' in v._zod.def);
      if (regexCheck instanceof z.core.$ZodCheckStringFormat) {
        return generators.regex(this.faker, regexCheck);
      }

      return this.faker.lorem.word();
    }
    if (schema instanceof z.ZodBigInt)
      return generators.bigInt(this.faker, schema);

    if (schema instanceof z.ZodNumber) {
      if (schema instanceof z.ZodNumberFormat) {
        const { format } = schema;
        if (format === 'float32') return generators.float(this.faker, schema);
        if (format === 'float64') return generators.float(this.faker, schema);
      }
      return generators.int(this.faker, schema);
    }

    if (schema instanceof z.ZodFile) return generators.file();

    if (schema instanceof z.ZodArray) {
      const length = this.faker.number.int({
        min: this.minArrayLength,
        max: this.maxArrayLength,
      });
      return Array.from({ length }, () =>
        this.generateFromSchema(schema.element),
      );
    }

    if (schema instanceof z.ZodObject) {
      const { shape } = schema;
      const result: { [key: string]: unknown } = {};

      for (const [key, value] of Object.entries(shape)) {
        result[key] = this.generateFromSchema(value);
      }
      return result;
    }

    if (schema instanceof z.ZodOptional) {
      if (
        this.faker.datatype.boolean({ probability: this.optionalProbability })
      )
        return undefined;
      return this.generateFromSchema(schema.unwrap());
    }

    if (schema instanceof z.ZodNullable) {
      if (
        this.faker.datatype.boolean({ probability: this.nullableProbability })
      )
        return null;
      return this.generateFromSchema(schema.unwrap());
    }

    if (schema instanceof z.ZodUnion) {
      const { options } = schema;
      const randomOption =
        this.faker.helpers.arrayElement<z.core.$ZodType>(options);
      return this.generateFromSchema(randomOption);
    }

    if (schema instanceof z.ZodNaN) return NaN;
    if (schema instanceof z.ZodBoolean) return this.faker.datatype.boolean();
    if (schema instanceof z.ZodLiteral) {
      return this.faker.helpers.arrayElement([...schema.values]);
    }
    if (schema instanceof z.ZodEnum) {
      return this.faker.helpers.arrayElement(schema.options);
    }
    if (schema instanceof z.ZodNull) return null;
    if (schema instanceof z.ZodUndefined) return undefined;
    if (schema instanceof z.ZodAny) return this.faker.lorem.word();
    if (schema instanceof z.ZodUnknown) return this.faker.lorem.word();
    if (schema instanceof z.ZodVoid) return undefined;
    if (schema instanceof z.ZodSymbol) return Symbol(this.faker.lorem.word());
    if (schema instanceof z.ZodDefault) {
      return this.generateFromSchema(schema.def.innerType);
    }

    if (schema instanceof z.ZodNever) {
      console.warn(
        'ZodNever schema encountered. Returning null for mock data as no valid value can exist.',
      );
      return null;
    }

    if (schema instanceof z.core.$ZodCheckStringFormat)
      return generators.regex(this.faker, schema);

    console.warn(
      `Unhandled Zod schema type: ${schema.constructor.name}. Returning dummy value.`,
    );
    return this.faker.lorem.word();
  }
}
