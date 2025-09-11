import { Faker } from '@faker-js/faker';
import { z } from 'zod';
import { generateMocks } from './generate-from-schema';
import type { CustomGeneratorType, GeneraterOptions, MockConfig } from './type';
import { createMockConfig, getLocales } from './util';

class MockGenerator {
  protected options: GeneraterOptions;

  constructor(config?: Partial<MockConfig>) {
    const mergedConfig = createMockConfig(config);
    const { locale, randomizer, seed, consistentKey } = mergedConfig;
    this.options = {
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

  /**
   * @description if return value is undefined, fallback to default generator
   */
  supply(constructor: z.core.$constructor<any>, value: any): MockGenerator {
    const prevGenerator = this.options.customGenerator;
    this.options.customGenerator = (schema, options) => {
      if (prevGenerator) {
        const res = prevGenerator(schema, options);
        if (res !== undefined) return res;
      }
      if (schema.constructor.name === constructor.name) return value;
    };
    return this;
  }

  /**
   * @description if return value is undefined, fallback to default generator
   */
  override(customGenerator: CustomGeneratorType): MockGenerator {
    const prevGenerator = this.options.customGenerator;
    this.options.customGenerator = (schema, options) => {
      if (prevGenerator) {
        const res = prevGenerator(schema, options);
        if (res !== undefined) return res;
      }
      return customGenerator(schema, options);
    };
    return this;
  }

  register(schemas: z.ZodType[]) {
    const { config, registry, valueStore } = this.options;
    const length = config.array?.max ?? 10;
    for (const schema of schemas) {
      const meta = schema.meta();
      if (!meta || !config.consistentKey) continue;
      const consistentName = meta[config.consistentKey];
      if (!consistentName) continue;

      if (typeof consistentName === 'string') {
        registry?.add(schema, { consistentName });
        const values = Array.from({ length }, () =>
          generateMocks(schema, this.options),
        );
        valueStore?.set(consistentName, values);
      }
    }
    return this;
  }

  generate(schema: z.ZodType) {
    return generateMocks(schema, this.options);
  }
}

export type { MockGenerator };

export function initGenerator(config?: Partial<MockConfig>): MockGenerator {
  const mockGenerator = new MockGenerator(config);
  return mockGenerator;
}
