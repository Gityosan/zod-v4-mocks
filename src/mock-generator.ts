import { Faker } from '@faker-js/faker';
import { z } from 'zod/v4';
import { generateFromSchema } from './generate-from-schema';
import type { CustomGeneratorType, MockConfig } from './type';
import { getLocales } from './util';

export function createMockConfig(config?: Partial<MockConfig>): MockConfig {
  return {
    minArrayLength: 1,
    maxArrayLength: 3,
    optionalProbability: 0.5,
    nullableProbability: 0.5,
    ...config,
  };
}

class MockGenerator {
  private schema: z.ZodType;
  private config: MockConfig;

  constructor(schema: z.ZodType, config?: MockConfig) {
    this.schema = schema;
    this.config = createMockConfig(config);
  }

  override(customGenerator: CustomGeneratorType): MockGenerator {
    this.config = { ...this.config, customGenerator };
    return this;
  }

  generate() {
    const faker = new Faker({
      locale: getLocales(this.config.locale),
      randomizer: this.config.randomizer,
      seed: this.config.seed,
    });

    return generateFromSchema(this.schema, faker, this.config);
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
