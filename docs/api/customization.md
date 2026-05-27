# Customization

Methods that shape *what* gets generated, before you call a
[generation](/api/generation) method. All of these are chainable — they return
the same `MockGenerator` instance.

The three `supply*` methods pin values at increasing levels of precision: by
**type** (`supply`), by **schema reference** (`supplyRef`), and by **path**
(`supplyPath`).

## supply

```ts
supply(constructor: z.core.$constructor<any>, value: any): MockGenerator
```

Sets a fixed value for a specific Zod type. When the same type is set multiple times, the first value set takes priority.

```ts
generator
  .supply(z.ZodString, 'test string')
  .supply(z.ZodEmail, 'test@example.com')
  .generate(schema)
```

## supplyRef

```ts
supplyRef(subSchema: z.core.$ZodType, value: unknown): MockGenerator
```

Pins a fixed value for one **specific schema instance** (by reference), rather
than for every schema of that type. Use it when two fields share the same Zod
type but only one of them should be fixed, or to give a value to an otherwise
un-mockable schema such as a bare `z.custom()`. First registered wins on
conflict.

```ts
const SpecialId = z.string()

const schema = z.object({
  id: z.string(),        // stays random
  specialId: SpecialId,  // always 'FIXED'
})

generator
  .supplyRef(SpecialId, 'FIXED')
  .generate(schema)
```

## supplyPath

```ts
supplyPath(path: PathSegment[], value: unknown): MockGenerator
```

Pins a fixed value at a **specific location** inside the generated structure,
addressed by a path of segments ([`PathSegment`](/api/types#pathsegment) is
`string | number | symbol`):

- **object** → string key
- **array / tuple** → number index
- **record / map** → literal key (injected even if it wasn't randomly generated)

Two marker constants address *all* elements at a position instead of one:

| Marker | Value | Matches |
|--------|-------|---------|
| `ITEM_MARKER` | `'$item'` | every element of an array / set / tuple |
| `VALUE_MARKER` | `'$value'` | every value of a record / map |

A literal segment always beats a marker on conflict (higher specificity wins).
Targeting a `'$key'` is intentionally not supported.

```ts
import { initGenerator, ITEM_MARKER, VALUE_MARKER } from 'zod-v4-mocks'

const schema = z.object({
  user: z.object({ name: z.string() }),
  tags: z.array(z.string()),
  scores: z.record(z.string(), z.number()),
})

generator
  .supplyPath(['user', 'name'], 'Alice')   // exact field
  .supplyPath(['tags', 0], 'first')         // first array element
  .supplyPath(['tags', ITEM_MARKER], 'x')   // every array element
  .supplyPath(['scores', VALUE_MARKER], 0)  // every record value
  .generate(schema)
```

::: tip Array length
A literal numeric index extends the generated array so the targeted index
exists (capped at an internal hard limit to guard against typos like
`supplyPath(['x', 1e8], …)`).
:::

## override

```ts
override(customGenerator: CustomGeneratorType): MockGenerator
```

Registers a custom generator function. If the function returns `undefined`, it falls back to the default generation logic.

```ts
const customGen: CustomGeneratorType = (schema, options) => {
  if (schema instanceof z.ZodString) {
    return options.faker.person.fullName()
  }
}

generator.override(customGen).generate(schema)
```

See [`CustomGeneratorType`](/api/types#customgeneratortype) and
[`GeneraterOptions`](/api/types#generateroptions) for the function signature,
and the [Custom Generator Guide](/guide/custom-generator) for patterns.

## register

```ts
register(schemas: z.ZodType[]): MockGenerator
```

Registers schemas for consistent data generation. Used together with `consistentKey` to assign the same values to fields that share the same metadata key.

```ts
const UserId = z.uuid().meta({ name: 'UserId' })

generator
  .register([UserId])
  .generate(z.object({ userId: UserId }))
```

`register` internally pre-generates `config.array.max` values for each schema and stores them in the valueStore. When a schema with the same metadata key is found during generation, values are retrieved from the store based on the array index.

## updateConfig

```ts
updateConfig(newConfig?: Partial<MockConfig>): MockGenerator
```

Updates the configuration. Existing `supply` / `override` settings are preserved.

```ts
generator.updateConfig({ seed: 42, array: { min: 5, max: 10 } })
```
