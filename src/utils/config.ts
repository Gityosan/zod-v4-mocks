import { Faker, type LocaleDefinition, allLocales } from '@faker-js/faker';
import { z } from 'zod';
import type { GeneraterOptions, LocaleType, MockConfig } from '../type';

export function getLocales(
  locales?: LocaleType | LocaleType[],
): LocaleDefinition[] {
  const defaultLocales = [allLocales.en, allLocales.base];
  if (!locales) return defaultLocales;
  const localesArray = Array.isArray(locales) ? locales : [locales];
  return [
    ...new Set([
      ...localesArray.map((locale) => allLocales[locale]),
      ...defaultLocales,
    ]),
  ];
}

export function createMockConfig(config?: Partial<MockConfig>): MockConfig {
  const {
    seed = 1,
    array: { min: arrayMin = 1, max: arrayMax = 3 } = { min: 1, max: 3 },
    map: { min: mapMin = 1, max: mapMax = 3 } = { min: 1, max: 3 },
    set: { min: setMin = 1, max: setMax = 3 } = { min: 1, max: 3 },
    record: { min: recordMin = 1, max: recordMax = 3 } = { min: 1, max: 3 },
    optionalProbability = 0.5,
    nullableProbability = 0.5,
    defaultProbability = 0.5,
    lazyDepthLimit = 5,
    ...rest
  } = config || {};
  return {
    seed,
    array: { min: arrayMin, max: arrayMax },
    map: { min: mapMin, max: mapMax },
    set: { min: setMin, max: setMax },
    record: { min: recordMin, max: recordMax },
    optionalProbability,
    nullableProbability,
    defaultProbability,
    lazyDepthLimit,
    ...rest,
  };
}

export function createGeneraterOptions(
  config?: Partial<MockConfig>,
): GeneraterOptions {
  const mergedConfig = createMockConfig(config);
  const { locale, randomizer, seed, consistentKey } = mergedConfig;
  return {
    faker: new Faker({ locale: getLocales(locale), randomizer, seed }),
    config: mergedConfig,
    registry: consistentKey
      ? z.registry<{ [consistentKey]: string }>()
      : null,
    valueStore: new Map(),
    arrayIndexes: [],
    pinnedHierarchy: new Map(),
  };
}
