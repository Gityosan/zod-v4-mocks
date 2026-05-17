import { allLocales, type Faker, type Randomizer } from '@faker-js/faker';
import type { z } from 'zod';
import type { KeyMapper } from './utils/key-mapping';
import type { PathSegment, PathSupply } from './utils/path';

export type { Faker, Randomizer } from '@faker-js/faker';
export type LocaleType = keyof typeof allLocales;

export type GeneraterOptions = {
  faker: Faker;
  config: MockConfig;
  customGenerator?: CustomGeneratorType;
  registry: z.core.$ZodRegistry<z.core.GlobalMeta> | null;
  valueStore?: Map<string, unknown[]>;
  arrayIndexes: number[];
  pinnedHierarchy: Map<string, number>;
  circularRefs: Map<z.core.$ZodType, number>;
  /** Path supplies still in scope at the current generation point. */
  pathSupplies: PathSupply[];
  /** Literal path segments traversed so far (for diagnostics / future hooks). */
  currentPath: PathSegment[];
  /**
   * Property name eligible for `keyMapping` at the current position.
   * Set only for object keys and literal/enum-typed record/map keys —
   * never for random record/map keys or array/tuple indices.
   */
  keyMappingKey?: string;
  /** Schema references registered via `supplyRef` (used by preflight). */
  supplyRefTargets: Set<z.core.$ZodType>;
  /**
   * True once `supply` or `override` has been registered. Their coverage
   * cannot be introspected, so preflight downgrades errors to warnings.
   */
  hasOpaqueCustomizer: boolean;
  /**
   * Auto-fixes from the pre-flight walk: a problematic schema mapped to a
   * minimally-changed replacement. The generator substitutes any schema
   * found here before generating.
   */
  preflightFixes: Map<z.core.$ZodType, z.core.$ZodType>;
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
   * @deprecated Use `recursiveDepthLimit` instead. Both control the same depth limit for recursive schemas.
   */
  lazyDepthLimit: number;
  /**
   * @default 5
   * @description Maximum depth for recursive schemas (z.lazy() and getter-based circular references).
   */
  recursiveDepthLimit?: number;
  /**
   * @description meta's attribute name which is used to generate consistent property value
   */
  consistentKey?: string;
  /**
   * @default 'mock'
   * @description meta's attribute name to look up a custom mock generator
   *  for `z.custom()` / `z.instanceof()` schemas.
   *  e.g. `z.custom<File>().meta({ mock: () => new File([], 'a') })`
   */
  customMockKey?: string;
  /**
   * @default 'off'
   * @description Map property keys (object/record/map) to faker functions
   *  for primitive leaf schemas (string/number/boolean/date).
   *  - `'off'`: no mapping (default).
   *  - `'auto'`: use built-in defaults for common keys (`name`, `email`,
   *    `age`, `createdAt`, ...).
   *  - `KeyMapper` function: custom; returning `undefined` falls back to
   *    the built-in defaults.
   */
  keyMapping?: 'off' | 'auto' | KeyMapper;
  /**
   * @default true
   * @description Run a pre-flight schema walk before generation that
   *  rejects schemas the library cannot safely mock (e.g. an un-mocked
   *  `z.custom()` at a fixed-length tuple position). Set to `false` to
   *  skip the check.
   */
  preflightCheck?: boolean;
}
