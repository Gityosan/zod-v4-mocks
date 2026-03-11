# Schema Support

A list of Zod schemas supported by zod-v4-mocks.

## Primitives

| Method        | Status              | Notes                                                                |
| ------------- | ------------------- | -------------------------------------------------------------------- |
| `string()`    | Fully supported     | min/max/regex/startsWith/endsWith/includes/trim etc. supported       |
| `number()`    | Fully supported     | min/max/int/float supported                                          |
| `bigint()`    | Fully supported     | min/max supported                                                    |
| `boolean()`   | Fully supported     | -                                                                    |
| `date()`      | Fully supported     | -                                                                    |
| `null()`      | Fully supported     | -                                                                    |
| `undefined()` | Fully supported     | -                                                                    |
| `void()`      | Fully supported     | -                                                                    |
| `any()`       | Supported           | Generates a string                                                   |
| `unknown()`   | Supported           | Generates a string                                                   |
| `nan()`       | Fully supported     | -                                                                    |
| `symbol()`    | Fully supported     | -                                                                    |
| `never()`     | Special handling    | Skipped internally (excluded from arrays, keys omitted from objects) |

## Collection Types

| Method            | Status              | Notes                              |
| ----------------- | ------------------- | ---------------------------------- |
| `object()`        | Fully supported     | Nesting supported                  |
| `array()`         | Fully supported     | min/max/nonempty/length supported  |
| `tuple()`         | Fully supported     | Preserves each element's type      |
| `record()`        | Fully supported     | Entry count is configurable        |
| `partialRecord()` | Fully supported     | [Details](#partialrecord-and-zodnever) |
| `map()`           | Fully supported     | min/max/nonempty supported         |
| `set()`           | Fully supported     | min/max/nonempty supported         |

### partialRecord and ZodNever

`partialRecord()` internally uses the same generation logic as `record()`. Since Zod internally transforms `partialRecord(keys, value)` into a value type of `union([value, never()])`, entries where `never()` is selected are automatically skipped during generation.

```ts
const schema = z.partialRecord(z.enum(['id', 'name', 'email']), z.string());

const mock = generator.generate(schema);
// => { id: "subito" } (only some keys are included)
// => {} (may result in an empty object)

schema.parse(mock); // OK - all keys are optional
```

This allows `partialRecord()` to naturally generate objects with only a subset of keys, unlike `record()`. The `record` `min`/`max` settings affect the number of entry generation attempts, but the actual number of keys may be fewer due to `ZodNever` skipping.

## Union and Intersection Types

| Method                 | Status              | Notes                                   |
| ---------------------- | ------------------- | --------------------------------------- |
| `union()`              | Fully supported     | Selected uniformly                      |
| `discriminatedUnion()` | Supported           | Selected uniformly                      |
| `xor()`                | Fully supported     | Exclusive union                         |
| `intersection()`       | Partially supported | [Details](#zodintersection-intersection) |

## Literal and Enum Types

| Method              | Status              | Notes                                                                       |
| ------------------- | ------------------- | --------------------------------------------------------------------------- |
| `literal()`         | Fully supported     | -                                                                           |
| `enum()`            | Fully supported     | -                                                                           |
| `templateLiteral()` | Fully supported     | Supports string/number/boolean/literal/union/null/undefined/nullable/optional |

### templateLiteral Notes

When using `templateLiteral` with `z.undefined()`, be aware of the value Zod expects.

```ts
const schema = z.templateLiteral(['Value: ', z.undefined()]);
type Schema = z.infer<typeof schema>;
// TypeScript infers `"Value: "`, but
// Zod expects `"Value: undefined"`

const mock = generator.generate(schema);
// => "Value: undefined" (follows Zod's behavior)
```

## Date/Time Formats

| Method                       | Status              | Format            |
| ---------------------------- | ------------------- | ----------------- |
| `datetime()`                 | Fully supported     | ISO 8601          |
| `isodate()`                  | Fully supported     | YYYY-MM-DD        |
| `isotime()`                  | Fully supported     | HH:MM:SS          |
| `isoduration()`              | Fully supported     | ISO 8601 Duration |

## String Formats

| Method                     | Status                    |
| -------------------------- | ------------------------- |
| `email()`                  | Fully supported           |
| `url()`                    | Fully supported           |
| `uuid()`                   | Fully supported (v1-v8)   |
| `guid()`                   | Fully supported           |
| `nanoid()`                 | Fully supported           |
| `ulid()`                   | Fully supported           |
| `cuid()` / `cuid2()`       | Fully supported           |
| `xid()` / `ksuid()`        | Fully supported           |
| `jwt()`                    | Fully supported           |
| `emoji()`                  | Fully supported           |
| `ipv4()` / `ipv6()`        | Fully supported           |
| `cidrv4()` / `cidrv6()`    | Fully supported           |
| `base64()` / `base64url()` | Fully supported           |
| `e164()`                   | Fully supported           |
| `hostname()`               | Fully supported           |

## String Constraint Support

String schemas support a rich set of method-style constraints.

| Constraint      | Example                                 | Supported |
| --------------- | --------------------------------------- | --------- |
| Length           | `length(10)`, `min(5)`, `max(20)`       | Yes       |
| Regex            | `regex(/^[A-Z]+$/)`                     | Yes       |
| Starts with      | `startsWith('PREFIX')`                  | Yes       |
| Ends with        | `endsWith('SUFFIX')`                    | Yes       |
| Contains         | `includes('KEYWORD')`                   | Yes       |
| Uppercase        | `toUpperCase()`, `uppercase()`          | Yes       |
| Lowercase        | `toLowerCase()`, `lowercase()`          | Yes       |
| Trim             | `trim()`                                | Yes       |
| Normalize        | `normalize()`                           | Yes       |
| Slugify          | `slugify()`                             | Yes       |

Multiple constraints can be combined:

```ts
const schema = z
  .string()
  .min(10)
  .max(30)
  .startsWith('PRE')
  .includes('X')
  .toLowerCase();

const mock = generator.generate(schema);
// => "prexqwerty..." (10-30 chars, starts with "PRE", contains "X", lowercase)
```

::: warning Note on constraint combinations
Some combinations may be contradictory (e.g., `regex(/^[a-z]+$/)` and `toUpperCase()`). Specifying contradictory constraints may result in generated values that fail validation.
:::

## Effects and Pipeline

| Method         | Status              | Notes                                      |
| -------------- | ------------------- | ------------------------------------------ |
| `transform()`  | Fully supported     | Transform is applied                       |
| `preprocess()` | Fully supported     | -                                          |
| `pipe()`       | Fully supported     | Generated from the output schema           |
| `codec()`      | Supported           | Supports stringbool etc.                   |
| `brand()`      | Supported           | Type-level only (no runtime impact)        |
| `refine()`     | Constraints ignored | [Details](#refine-validation)              |
| `check()`      | Partially supported | [Details](#check-validation-checks)        |

## Special Types

| Method      | Status              | Notes                              |
| ----------- | ------------------- | ---------------------------------- |
| `lazy()`    | Partially supported | [Details](#zodlazy-recursive-type) |
| `success()` | Supported           | -                                  |
| `catch()`   | Supported           | -                                  |
| `file()`    | Supported           | Generates an empty test.txt file   |
| `apply()`   | Supported           | Schema transformation helper       |

## Modifiers

| Method            | Status              | Notes                                         |
| ----------------- | ------------------- | --------------------------------------------- |
| `optional()`      | Fully supported     | Controlled by `optionalProbability`            |
| `exactOptional()` | Fully supported     | Key omitted entirely (not `undefined`)         |
| `nullable()`      | Fully supported     | Controlled by `nullableProbability`            |
| `default()`       | Fully supported     | Controlled by `defaultProbability`             |
| `prefault()`      | Fully supported     | Controlled by `defaultProbability`             |
| `nonoptional()`   | Fully supported     | Removes optional                               |
| `readonly()`      | Fully supported     | Type-level only                                |

## Partially Supported Details

### ZodIntersection (Intersection)

**Status**: Partially supported

Intersections between the same types are generally supported, but intersections between different types are limited.

#### Working Examples

```ts
// Intersection of objects
const schema = z.intersection(
  z.object({ a: z.string() }),
  z.object({ b: z.number() }),
);
// => { a: "subito", b: 123 }

// Intersection of number ranges
const rangeSchema = z.intersection(
  z.number().min(0).max(100),
  z.number().min(50).max(150),
);
// => a number between 50 and 100
```

#### Limitations

- Same-type intersections are generally supported
- **Different-type intersections are generally unsupported** (the following are exceptions):
  - `ZodObject` and `ZodRecord`
  - `ZodArray` and `ZodTuple`
- If one side is `ZodAny` / `ZodUnknown`, the other type is used
- Errors occur if Map/Set/Array/Enum/Union elements are incompatible

### ZodLazy (Recursive Type)

**Status**: Partially supported

Recursive schemas are supported, but with a depth limit. Getter-based circular references are also supported in the same way.

#### Working Examples

```ts
// Self-reference via z.lazy()
type Category = {
  name: string;
  subcategories: Category[];
};

const categorySchema: z.ZodType<Category> = z.lazy(() =>
  z.object({
    name: z.string(),
    subcategories: z.array(categorySchema),
  }),
);

// Self-reference via getters (recommended pattern in Zod v4)
const Node = z.object({
  value: z.number(),
  get next() {
    return Node.optional();
  },
});

// Mutual references
const User = z.object({
  email: z.email(),
  get posts() {
    return z.array(Post);
  },
});

const Post = z.object({
  title: z.string(),
  get author() {
    return User;
  },
});
```

#### Limitations

- Depth limited (default: 5 levels, configurable via `recursiveDepthLimit`)
- An empty object `{}` is returned when the depth limit is reached
- Possible errors when `union` is at the top level
- `z.lazy()` and getters are guaranteed to reach the same depth

```ts
const gen = initGenerator({ recursiveDepthLimit: 3 });
const result = gen.generate(categorySchema);
// truncated at 3 levels
```

### refine() (Validation)

**Status**: Constraints ignored

`refine()` validation conditions are **ignored** during mock generation.

```ts
const schema = z.number().refine((val) => val > 0, {
  message: 'Must be positive',
});

const mock = generator.generate(schema);
// => a number is generated, but > 0 is not guaranteed
```

As a workaround, you can use `override` to generate values that satisfy the condition.

### check() (Validation Checks)

**Status**: Partially supported

Validations via the `check()` function only support **transformation-type checks** such as `z.overwrite()` / `z.trim()` / `z.toLowerCase()` / `z.toUpperCase()`.

| API                                    | Status        | Notes                      |
| -------------------------------------- | ------------- | -------------------------- |
| `regex(/pattern/)`                     | Supported     | Method-style (recommended) |
| `check(z.regex(/pattern/))`           | Unsupported   | Via `check()` function     |
| `trim()`                               | Supported     | Method-style (recommended) |
| `check(z.trim())`                     | Supported     | Overwrite helper           |
| `check(z.overwrite(...))`             | Supported     | Transform is applied       |
| `check(z.minLength(...))`             | Unsupported   | -                          |
| `with(z.minLength(5), z.toLowerCase())`| Supported    | Equivalent to `check()`    |

::: tip Recommendation
Use **method-style** validation (`regex()`, `min()`, `max()`, etc.). All method-style validations are supported.
:::

---

## Unsupported

| Schema                      | Reason                                  | Workaround                           |
| --------------------------- | --------------------------------------- | ------------------------------------ |
| `custom()` / `instanceof()` | Cannot analyze custom validations      | Provide values via `override`        |
| `function()`                | Generating function mocks is complex    | Provide mock functions via `override` |
| `nativeEnum()`              | Deprecated in Zod v4                    | Use `enum()` instead                 |
| `catchall()`                | Ignored (no impact on mock generation)  | -                                    |

### Workaround Examples for Unsupported Schemas

```ts
// Workaround for z.custom()
const myCustomSchema = z.custom<MyClass>((val) => val instanceof MyClass);

const mock = initGenerator()
  .override((schema) => {
    if (schema === myCustomSchema) {
      return new MyClass();
    }
  })
  .generate(myCustomSchema);
```

```ts
// Workaround for z.function()
const fnSchema = z.function().args(z.string()).returns(z.boolean());

const mock = initGenerator()
  .override((schema) => {
    if (schema instanceof z.ZodFunction) {
      return (str: string) => str.length > 0;
    }
  })
  .generate(fnSchema);
```
