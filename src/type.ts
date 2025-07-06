import { allLocales, type Faker, type Randomizer } from '@faker-js/faker';
import type { z } from 'zod/v4';

export type { Faker, Randomizer } from '@faker-js/faker';
export type LocaleType = keyof typeof allLocales;

/**
 * @package
 */
export type GeneraterOptions = {
  faker: Faker;
  config: MockConfig;
  customGenerator?: CustomGeneratorType;
  registry: z.core.$ZodRegistry<z.core.GlobalMeta> | null;
  valueStore?: Map<string, unknown[]>;
  arrayIndexes: number[];
  pinnedHierarchy: Map<string, number>;
};

export type CustomGeneratorType = (
  schema: z.core.$ZodType,
  options: GeneraterOptions,
) => unknown;

export interface MockConfig {
  locale?: LocaleType | LocaleType[];
  randomizer?: Randomizer;
  seed?: number;
  minArrayLength?: number;
  maxArrayLength?: number;
  optionalProbability?: number;
  nullableProbability?: number;
  /**
   * @description meta's attribute name which is used to generate consistent property value
   */
  consistentKey?: string;
}
