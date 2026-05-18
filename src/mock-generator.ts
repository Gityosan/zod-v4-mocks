import { z } from 'zod';
import { generateMocks } from './generate-from-schema';
import type { CustomGeneratorType, GeneraterOptions, MockConfig } from './type';
import {
  createGeneraterOptions,
  deserializeBinary,
  makePathSupply,
  OMIT_SYMBOL,
  outputToFile,
  type PathSegment,
  regenerateIfOmitted,
  runPreflight,
  serializeBinary,
  serializeOutput,
  type OutputOptions,
} from './utils';

class MockGenerator {
  protected options: GeneraterOptions;
  /** Schemas that have already passed preflight (memo for generateMany). */
  #preflighted = new WeakSet<object>();

  constructor(config?: Partial<MockConfig>) {
    this.options = createGeneraterOptions(config);
  }

  updateConfig(newConfig?: Partial<MockConfig>): MockGenerator {
    const {
      customGenerator,
      config,
      pathSupplies,
      supplyRefTargets,
      hasOpaqueCustomizer,
    } = this.options;
    this.options = createGeneraterOptions({ ...config, ...newConfig });
    // Customizations registered via supply/supplyRef/override/supplyPath
    // are not part of MockConfig — carry them across a config change.
    this.options.customGenerator = customGenerator;
    this.options.pathSupplies = pathSupplies;
    this.options.supplyRefTargets = supplyRefTargets;
    this.options.hasOpaqueCustomizer = hasOpaqueCustomizer;
    // A config change may alter preflight relevance — reset the memo.
    this.#preflighted = new WeakSet<object>();
    return this;
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
    this.options.hasOpaqueCustomizer = true;
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
    this.options.hasOpaqueCustomizer = true;
    return this;
  }

  /**
   * @description Supply a fixed value when the exact same schema reference
   *  is encountered during generation. First registered wins on conflict.
   */
  supplyRef(subSchema: z.core.$ZodType, value: unknown): MockGenerator {
    const prevGenerator = this.options.customGenerator;
    this.options.customGenerator = (schema, options) => {
      if (prevGenerator) {
        const res = prevGenerator(schema, options);
        if (res !== undefined) return res;
      }
      if (schema === subSchema) return value;
    };
    this.options.supplyRefTargets.add(subSchema);
    return this;
  }

  /**
   * @description Supply a fixed value at a specific path inside the
   *  generated structure.
   *  - object: string key  | array/tuple: number index
   *  - record/map: literal key (injected if absent)
   *  - markers: '$item' (array/set/tuple all elements), '$value' (record/map all values)
   *  Specific paths beat marker paths; '$key' is intentionally not supported.
   */
  supplyPath(path: PathSegment[], value: unknown): MockGenerator {
    this.options.pathSupplies = [
      ...this.options.pathSupplies,
      makePathSupply(path, value),
    ];
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

  /**
   * Run the pre-flight schema walk once per schema. Throws on error-level
   * diagnostics; for warning-level diagnostics it emits the warning and
   * applies the associated minimal schema fix so generation proceeds with
   * the corrected schema. No-op when `preflightCheck` is disabled.
   */
  #preflight(schema: z.core.$ZodType): void {
    if (this.options.config.preflightCheck === false) return;
    if (this.#preflighted.has(schema)) return;
    const { diagnostics, fixes } = runPreflight(schema, {
      customMockKey: this.options.config.customMockKey ?? 'mock',
      supplyRefTargets: this.options.supplyRefTargets,
      hasOpaqueCustomizer: this.options.hasOpaqueCustomizer,
    });
    for (const d of diagnostics) {
      if (d.level === 'warning') {
        console.warn(`[preflight] ${d.path}: ${d.message}`);
      }
    }
    const errors = diagnostics.filter((d) => d.level === 'error');
    if (errors.length > 0) {
      const lines = errors
        .map((e) => `  - ${e.path}: ${e.message}`)
        .join('\n');
      throw new Error(
        `Preflight check found ${errors.length} issue(s):\n${lines}\n` +
          'Disable with initGenerator({ preflightCheck: false }).',
      );
    }
    // Merge auto-fixes (keyed by schema reference) into the persistent map
    // rather than replacing it — a memoized schema generated after another
    // schema's preflight must still see its own fixes.
    for (const [from, to] of fixes) {
      this.options.preflightFixes.set(from, to);
    }
    this.#preflighted.add(schema);
  }

  // Overloads: ZodFunction is not supported -> unknown, others -> z.infer<T>
  generate<T extends z.ZodFunction>(schema: T): unknown;
  generate<T extends z.ZodType>(schema: T): z.infer<T>;
  generate(schema: z.ZodType): unknown {
    this.#preflight(schema);
    const result = generateMocks(schema, this.options);
    const final = regenerateIfOmitted(
      result,
      schema,
      this.options,
      generateMocks,
    );
    if (final === OMIT_SYMBOL) {
      // A bare z.custom()/z.never with no value provider reached the top
      // level. Surface a warning instead of leaking the internal sentinel.
      console.warn(
        'generate(): the schema produced no value (e.g. an un-mocked ' +
          'z.custom() or z.never()). Returning undefined. Provide ' +
          '.meta({ mock: ... }) or use supplyRef().',
      );
      return undefined;
    }
    return final;
  }

  multiGenerate<T extends Record<string, z.ZodType>>(
    schemas: T,
  ): { [K in keyof T]: z.infer<T[K]> } {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(schemas)) {
      result[key] = this.generate(schemas[key]);
    }
    return result as { [K in keyof T]: z.infer<T[K]> };
  }

  /**
   * Generate `count` independent mocks for the same schema. The seeded RNG
   * produces deterministic but distinct values on each call.
   */
  generateMany<T extends z.ZodType>(schema: T, count: number): z.infer<T>[] {
    if (!Number.isInteger(count) || count < 0) {
      throw new Error(
        `generateMany: count must be a non-negative integer (got: ${count})`,
      );
    }
    const out: z.infer<T>[] = [];
    for (let i = 0; i < count; i++) {
      out.push(this.generate(schema) as z.infer<T>);
    }
    return out;
  }

  /**
   * Return a factory bound to the schema. Each `.next()` produces a fresh
   * mock; `.take(n)` returns an array of n mocks.
   */
  factory<T extends z.ZodType>(
    schema: T,
  ): { next: () => z.infer<T>; take: (n: number) => z.infer<T>[] } {
    return {
      next: () => this.generate(schema) as z.infer<T>,
      take: (n: number) => this.generateMany(schema, n),
    };
  }

  serialize(data: unknown, options?: OutputOptions): string {
    return serializeOutput(data, options);
  }

  /**
   * Serialize data to a binary Buffer using Node.js's structured clone
   * algorithm (`v8.serialize`). Preserves Date, Map, Set, RegExp, BigInt,
   * TypedArray, `undefined`, and circular references with no information loss.
   * The result is only readable in a Node.js environment.
   */
  serializeBinary(data: unknown): Buffer {
    return serializeBinary(data);
  }

  /**
   * Deserialize a Buffer (or `.bin` file path) produced by `serializeBinary`
   * or `output({ binary: true })` back into the original JavaScript value.
   *
   * Pass a generic type parameter to cast the result, e.g.
   * `generator.deserialize<User>('./user.bin')`.
   */
  deserialize<T = unknown>(input: Buffer | Uint8Array | string): T {
    return deserializeBinary<T>(input);
  }

  output(data: unknown, options?: OutputOptions): string {
    return outputToFile(data, options);
  }
}

export type { MockGenerator };

export function initGenerator(config?: Partial<MockConfig>): MockGenerator {
  const mockGenerator = new MockGenerator(config);
  return mockGenerator;
}
