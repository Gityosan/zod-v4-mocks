import { Faker } from '@faker-js/faker';
import { z } from 'zod/v4';
import { generateFromSchema } from './generate-from-schema';
import type { CustomGeneratorType, MockConfig } from './type';
import { getLocales } from './util';

function createMockConfig(config?: Partial<MockConfig>): MockConfig {
  const {
    minArrayLength = 1,
    maxArrayLength = 3,
    optionalProbability = 0.5,
    nullableProbability = 0.5,
    consistentName = 'name',
    ...rest
  } = config || {};
  return {
    minArrayLength,
    maxArrayLength,
    optionalProbability,
    nullableProbability,
    consistentName,
    ...rest,
  };
}

class MockGenerator {
  private schema: z.ZodType;
  private config: MockConfig;
  private registry: z.core.$ZodRegistry<z.core.GlobalMeta> | null;
  private faker: Faker;

  constructor(schema: z.ZodType, config?: MockConfig) {
    const mergedConfig = createMockConfig(config);
    this.schema = schema;
    this.config = mergedConfig;
    if (mergedConfig.consistentName) {
      this.registry = z.registry<{ [mergedConfig.consistentName]: string }>();
    } else {
      this.registry = null;
    }
    this.faker = new Faker({
      locale: getLocales(this.config.locale),
      randomizer: this.config.randomizer,
      seed: this.config.seed,
    });
  }

  override(customGenerator: CustomGeneratorType): MockGenerator {
    this.config = { ...this.config, customGenerator };
    return this;
  }

  register(schemas: z.ZodType[]) {
    for (const schema of schemas) {
      const meta = schema.meta();
      if (!meta || !this.config.consistentName) continue;
      const consistentName = meta[this.config.consistentName];
      if (!consistentName) continue;
      this.registry?.add(schema, { consistentName });
    }
    return this;
  }

  generate() {
    return generateFromSchema(this.schema, {
      faker: this.faker,
      config: this.config,
      registry: this.registry,
    });
  }

  [Symbol.toPrimitive]() {
    return this.generate();
  }
}

export function generateMock(
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
    return generateMock(schema, this.config).generate();
  }
}
