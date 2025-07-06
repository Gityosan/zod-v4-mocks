import { allLocales, Faker, type Randomizer } from '@faker-js/faker';
import { z } from 'zod/v4';

/**
 * @package
 */
export type LocaleType = keyof typeof allLocales;

/**
 * @package
 */
export type CustomGeneratorType = (
  faker: Faker,
  schema: z.core.$ZodType,
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
}
