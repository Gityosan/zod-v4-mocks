import { allLocales, Faker, type Randomizer } from '@faker-js/faker';
import { z } from 'zod/v4';

/**
 * @package
 */
export type LocaleType = keyof typeof allLocales;

export type GeneraterOptions = {
  faker: Faker;
  config: MockConfig;
  registry: z.core.$ZodRegistry<z.core.GlobalMeta> | null;
};

/**
 * @package
 */
export type CustomGeneratorType = (
  schema: z.core.$ZodType,
  options: GeneraterOptions,
) => unknown;

/**
 * @package
 */
export interface MockConfig {
  locale?: LocaleType | LocaleType[];
  randomizer?: Randomizer;
  seed?: number;
  minArrayLength?: number;
  maxArrayLength?: number;
  optionalProbability?: number;
  nullableProbability?: number;
  customGenerator?: CustomGeneratorType;
  consistentName?: string; // meta's attribute name which is used to generate consistent property value
}
