# Types

The exported type definitions. Most are imported as `import type { … } from 'zod-v4-mocks'`.

## MockConfig

```ts
interface MockConfig {
  /** @default [en, base] */
  locale?: LocaleType | LocaleType[]
  /** @default generateMersenne53Randomizer() from faker.js */
  randomizer?: Randomizer
  /** @default 1 */
  seed: number
  /** @default { min: 1, max: 3 } */
  array: { min: number; max: number }
  /** @default { min: 1, max: 3 } */
  map: { min: number; max: number }
  /** @default { min: 1, max: 3 } */
  set: { min: number; max: number }
  /** @default { min: 1, max: 3 } */
  record: { min: number; max: number }
  /** @default 0.5 */
  optionalProbability: number
  /** @default 0.5 */
  nullableProbability: number
  /** @default 0.5 */
  defaultProbability: number
  /** @default 5 @deprecated Use recursiveDepthLimit instead */
  lazyDepthLimit: number
  /** @default 5 — max depth for recursive schemas (z.lazy / circular getters) */
  recursiveDepthLimit?: number
  /** Metadata key name (used with register) */
  consistentKey?: string
  /** @default 'mock' — meta key for a custom mock generator on z.custom()/z.instanceof() */
  customMockKey?: string
  /** @default 'off' — map property keys to faker functions: 'off' | 'auto' | KeyMapper */
  keyMapping?: 'off' | 'auto' | KeyMapper
  /** @default true — run a pre-flight schema walk that rejects un-mockable schemas */
  preflightCheck?: boolean
}
```

See the [Configuration Guide](/guide/configuration) for details on each setting.

::: info preflightCheck
With `preflightCheck` enabled (the default), `generate` walks the schema once
before generating and throws on schemas it cannot safely mock — for example an
un-mocked `z.custom()` at a fixed-length tuple position. Warning-level issues
are logged and auto-fixed. Disable it with `initGenerator({ preflightCheck: false })`.
:::

## CustomGeneratorType

```ts
type CustomGeneratorType = (
  schema: z.core.$ZodType,
  options: GeneraterOptions,
) => unknown | undefined
```

When `undefined` is returned, the default generation logic is used. Passed to [`override`](/api/customization#override).

## GeneraterOptions

```ts
type GeneraterOptions = {
  faker: Faker                          // seeded faker instance
  config: MockConfig                    // current configuration
  customGenerator?: CustomGeneratorType // custom generator
  registry: z.core.$ZodRegistry | null  // schema registry
  valueStore?: Map<string, unknown[]>   // pre-generated values from register
  arrayIndexes: number[]                // current array indexes
  pinnedHierarchy: Map<string, number>  // hierarchy for consistent generation
  circularRefs: Map<z.core.$ZodType, number> // circular reference depth tracking
  pathSupplies: PathSupply[]            // supplyPath entries in scope at this point
  keyMappingKey?: string                // property name eligible for keyMapping here
  supplyRefTargets: Set<z.core.$ZodType> // schema refs registered via supplyRef
  hasOpaqueCustomizer: boolean          // true once supply/override is registered
  preflightFixes: Map<z.core.$ZodType, z.core.$ZodType> // auto-fixes from preflight
}
```

In custom generators for `override`, you will mainly use `faker` and `config`; the rest are internal generation state.

## OutputOptions

```ts
type OutputOptions = {
  path?: string
  ext?: 'json' | 'js' | 'ts'
  exportName?: string
  header?: string
  footer?: string
  binary?: boolean | 'v8' | 'greft'
}
```

Used by [`serialize`](/api/serialization#serialize) and [`output`](/api/serialization#output). Field-by-field notes are on the [Serialization & Output](/api/serialization#outputoptions) page.

## GreftOptions

```ts
type GreftOptions = {
  base64?: boolean // return/accept a base64 string instead of raw bytes (text-safe, node-free, cross-language)
}
```

Used by [`serializeGreft`](/api/serialization#serializegreft) and [`deserializeGreft`](/api/serialization#deserializegreft). Pass the same flag to both sides.

## PortableOptions

```ts
type PortableOptions = {
  base64?: boolean // base64-encode the string (text-safe)
}
```

Used by [`serializePortable`](/api/serialization#serializeportable-serializeportableasync) and [`deserializePortable`](/api/serialization#deserializeportable). Pass the same flag to both sides.

## PathSegment

```ts
type PathSegment = string | number | symbol
```

A single step in a [`supplyPath`](/api/customization#supplypath) path. Object
keys are strings, array/tuple positions are numbers, and the two marker
constants target all elements at a position:

```ts
import { ITEM_MARKER, VALUE_MARKER } from 'zod-v4-mocks'

ITEM_MARKER  // '$item'  — every element of an array / set / tuple
VALUE_MARKER // '$value' — every value of a record / map
```

## Re-exports

```ts
type LocaleType   // keyof typeof allLocales — valid faker locale keys
type Faker        // faker.js Faker type (re-export)
type Randomizer   // faker.js Randomizer type (re-export)
```
