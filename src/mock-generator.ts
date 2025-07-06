import { Faker } from '@faker-js/faker';
import { z } from 'zod/v4';
import { generateMocks } from './generate-from-schema';
import type { CustomGeneratorType, GeneraterOptions, MockConfig } from './type';
import { createMockConfig, getLocales } from './util';

class MockGenerator {
  private schema: z.ZodType;
  private options: GeneraterOptions;

  constructor(schema: z.ZodType, config?: MockConfig) {
    this.schema = schema;
    const mergedConfig = createMockConfig(config);
    const { locale, randomizer, seed, consistentName } = mergedConfig;
    this.options = {
      faker: new Faker({ locale: getLocales(locale), randomizer, seed }),
      config: mergedConfig,
      registry: consistentName
        ? z.registry<{ [consistentName]: string }>()
        : null,
      valueStore: new Map(),
    };
  }

  override(customGenerator: CustomGeneratorType): MockGenerator {
    this.options.config.customGenerator = customGenerator;
    return this;
  }

  register(schemas: z.ZodType[]) {
    const { config, valueStore, registry } = this.options;
    const { maxArrayLength } = config;
    for (const schema of schemas) {
      const meta = schema.meta();
      if (!meta || !config.consistentName) continue;
      const consistentName = meta[config.consistentName];
      if (!consistentName) continue;

      if (typeof consistentName === 'string') {
        const length = maxArrayLength ?? 10;
        const values = Array.from({ length }, () =>
          generateMocks(schema, this.options),
        );
        valueStore?.set(consistentName, values);
      }

      registry?.add(schema, { consistentName });
    }
    return this;
  }

  generate() {
    return generateMocks(this.schema, this.options);
  }

  [Symbol.toPrimitive]() {
    return this.generate();
  }
}

export function initGenerator(
  schema: z.ZodType,
  config?: MockConfig,
): MockGenerator {
  const mockGenerator = new MockGenerator(schema, config);
  return mockGenerator;
}

/**
 * @deprecated Use generateMock function instead
 */
export class ZodMockGenerator {
  private config: MockConfig;

  constructor(config: MockConfig) {
    this.config = createMockConfig(config);
  }

  generate(schema: z.ZodType) {
    return initGenerator(schema, this.config).generate();
  }
}
