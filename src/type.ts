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
  lazyDepth?: number;
};

export type CustomGeneratorType = (
  schema: z.core.$ZodType,
  options: GeneraterOptions,
) => unknown;

export interface MockConfig {
  /**
   * @default [en, base] from faker.js
   */
  locale?: LocaleType | LocaleType[];
  /**
   * @default generateMersenne53Randomizer() from faker.js
   */
  randomizer?: Randomizer;
  /**
   * @default 1
   */
  seed: number;
  /**
   * @default { min: 1, max: 3 }
   */
  array: { min: number; max: number };
  /**
   * @default { min: 1, max: 3 }
   */
  map: { min: number; max: number };
  /**
   * @default { min: 1, max: 3 }
   */
  set: { min: number; max: number };
  /**
   * @default { min: 1, max: 3 }
   */
  record: { min: number; max: number };
  /**
   * @default 0.5
   */
  optionalProbability: number;
  /**
   * @default 0.5
   */
  nullableProbability: number;
  /**
   * @default 0.5
   */
  defaultProbability: number;
  /**
   * @default 5
   */
  lazyDepthLimit: number;
  /**
   * @description meta's attribute name which is used to generate consistent property value
   */
  consistentKey?: string;
}
