# zod-v4-mocks

Mock generator for zod v4

## Installation

```bash
npm install zod-v4-mocks
```

## Basic Usage

```ts
import { initGenerator } from 'zod-v4-mocks';
import { z } from 'zod';

const schema = z.string();

const generator = initGenerator({ seed: 1 });
const res = generator.generate(schema);
console.log(schema.parse(res));
```

## Usage Details

### 1. Basic Usage

The simplest way to use the library. Generate mock data from a schema.

```ts
import { z } from 'zod';
import { initGenerator } from 'zod-v4-mocks';

const basicSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
  age: z.number().min(18).max(120).optional(),
  isActive: z.boolean(),
  tags: z.array(z.string()),
  createdAt: z.date(),
});

const mockUser = initGenerator().generate(basicSchema);
```

### 2. Custom Configuration

You can customize settings such as seed value, array length, and locale.

```ts
const config = {
  seed: 42,
  array: { min: 2, max: 5 },
  locale: 'ja',
} as const;

const mockUserWithConfig = initGenerator(config).generate(basicSchema);
```

The available configuration options are as follows:

```ts
interface MockConfig {
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
   */
  lazyDepthLimit: number;
  /**
   * @description meta's attribute name which is used to generate consistent property value
   */
  consistentKey?: string;
}
```

### 3. Supply Specific Values (as Custom Generator)

You can supply fixed values for specific schema types.

```ts
const mockUserWithSupply = initGenerator()
  .supply(z.ZodString, 'custom name')
  .supply(z.ZodEmail, 'custom_email@example.com')
  .generate(basicSchema);
```

If you configure multiple values for the same ZodType condition, the first configured value takes priority.

```ts
const mockUserWithSupply = initGenerator()
  .supply(z.ZodEmail, 'prioritized_email@example.com')
  .supply(z.ZodEmail, 'not_prioritized_email@example.com')
  .generate(basicSchema);
```

### 4. Override mock generator (as Custom Generator)

You can define custom generator functions for specific schemas.

```ts
import { type CustomGeneratorType } from 'zod-v4-mocks';

const customGenerator: CustomGeneratorType = (schema, options) => {
  const { faker } = options;
  if (schema instanceof z.ZodString && schema === basicSchema.shape.name) {
    return 'custom name: ' + faker.person.fullName();
  }
};

const mockUserWithOverride = initGenerator()
  .override(customGenerator)
  .generate(basicSchema);
```

If you configure multiple values for the same ZodType condition, the first configured value takes priority.

```ts
const customGenerator: CustomGeneratorType = (schema, options) => {
  const { faker } = options;
  if (schema instanceof z.ZodEmail) {
    return 'not_prioritized_email@example.com';
  }
};

const mockUserWithSupply = initGenerator()
  .supply(z.ZodEmail, 'prioritized_email@example.com')
  .override(customGenerator)
  .generate(basicSchema);
```

### 5. Complex Schemas

Supports complex schemas including nested objects, arrays, records, and unions.

```ts
const complexSchema = z.object({
  user: z.object({
    profile: z.object({
      name: z.string(),
      bio: z.string().optional(),
    }),
    preferences: z.object({
      theme: z.enum(['light', 'dark', 'auto']),
      notifications: z.boolean().default(true),
    }),
  }),
  posts: z.array(
    z.object({
      title: z.string(),
      content: z.string(),
      publishedAt: z.date().nullable(),
      tags: z.array(z.string()),
    }),
  ),
  metadata: z.record(
    z.string(),
    z.union([z.string(), z.number(), z.boolean()]),
  ),
});

const complexMock = initGenerator().generate(complexSchema);
```

### 6. Consistent Data Generation (Register)

You can generate consistent data between related fields using metadata.

```ts
// Set the metadata key name
const consistentKey = 'name';
const UserId = z.uuid().meta({ [consistentKey]: 'UserId' });
const CommentId = z.uuid().meta({ [consistentKey]: 'CommentId' });
const PostId = z.uuid().meta({ [consistentKey]: 'PostId' });

const userSchema = z.object({
  id: UserId, // 1: Same UserId will be generated
  name: z.string(),
});

const commentSchema = z.object({
  id: CommentId,
  postId: PostId, // 2: Same PostId will be generated
  user: userSchema,
  userId: UserId, // 1: Same UserId will be generated
  value: z.string(),
});

const postSchema = z.object({
  id: PostId, // 2: Same PostId will be generated
  comments: z.array(commentSchema),
  value: z.string(),
});

const PostsResponse = z.array(postSchema);

// Register schemas first, then generate
const schemas = [CommentId, UserId, PostId];
const mock = initGenerator({ consistentKey })
  .register(schemas)
  .generate(PostsResponse);
```

This generator will generate mock like below.

```json
[
  {
    "id": "08e93b6a-0a0b-4718-81af-c91ba0c86c67",
    "comments": [
      {
        "id": "b438b6fa-765b-4706-8b22-88adb9b5534a",
        "postId": "08e93b6a-0a0b-4718-81af-c91ba0c86c67",
        "user": {
          "id": "c9b26358-a125-4ad8-ad65-52d58980fe34",
          "name": "acceptus"
        },
        "userId": "c9b26358-a125-4ad8-ad65-52d58980fe34",
        "value": "antepono"
      },
      {
        "id": "667646ef-8915-46d4-a7f8-91d98546ae8a",
        "postId": "08e93b6a-0a0b-4718-81af-c91ba0c86c67",
        "user": {
          "id": "ef49c6b2-9df1-4637-a814-e97cb0bd2c44",
          "name": "tergiversatio"
        },
        "userId": "ef49c6b2-9df1-4637-a814-e97cb0bd2c44",
        "value": "adipisci"
      },
      {
        "id": "9ad1c339-1eab-4098-922b-5b86ed5046bf",
        "postId": "08e93b6a-0a0b-4718-81af-c91ba0c86c67",
        "user": {
          "id": "1aeb77c9-19d5-4ec9-bc1d-de21266813c7",
          "name": "sum"
        },
        "userId": "1aeb77c9-19d5-4ec9-bc1d-de21266813c7",
        "value": "volup"
      }
    ],
    "value": "ut"
  },
  {
    "id": "5d26f3ee-1785-4031-93ce-04f8a07f617f",
    "comments": [
      {
        "id": "b438b6fa-765b-4706-8b22-88adb9b5534a",
        "postId": "5d26f3ee-1785-4031-93ce-04f8a07f617f",
        "user": {
          "id": "c9b26358-a125-4ad8-ad65-52d58980fe34",
          "name": "vitae"
        },
        "userId": "c9b26358-a125-4ad8-ad65-52d58980fe34",
        "value": "curtus"
      },
      {
        "id": "667646ef-8915-46d4-a7f8-91d98546ae8a",
        "postId": "5d26f3ee-1785-4031-93ce-04f8a07f617f",
        "user": {
          "id": "ef49c6b2-9df1-4637-a814-e97cb0bd2c44",
          "name": "uterque"
        },
        "userId": "ef49c6b2-9df1-4637-a814-e97cb0bd2c44",
        "value": "constans"
      },
      {
        "id": "9ad1c339-1eab-4098-922b-5b86ed5046bf",
        "postId": "5d26f3ee-1785-4031-93ce-04f8a07f617f",
        "user": {
          "id": "1aeb77c9-19d5-4ec9-bc1d-de21266813c7",
          "name": "vetus"
        },
        "userId": "1aeb77c9-19d5-4ec9-bc1d-de21266813c7",
        "value": "arcesso"
      }
    ],
    "value": "vilicus"
  }
]
```

## Unsupported Schemas

- `z.ZodCustom`
  - `.custom()` and `.instanceof()` are not supported
  - `.refine()` and `.check()` are ignored
- `.catchall()` is ignored
- `.function()` is not supported
- `.nativeEnum()` is deprecated in v4
- `.promise()` is deprecated in v4
- `.superRefine()` is deprecated in v4

## Partially Supported Schemas

- `z.ZodLazy` is partially supported
  - If schema has toplevel `z.union`, this library would throw error
  - If schema has `z.tuple` or `z.intersection` anywhere, this library would cause RangeError
- `z.ZodIntersection` is partially supported
  - Same schema types are basically supported
    - But, if the elements of the Map/Set/Array/Enum/Union do not have compatible elements, then this library would throw error.
  - Different schema types are not supported in principle
    - But, ZodObject and ZodRecord would be successfully generated
    - But, ZodArray and ZodTuple would be successfully generated
  - If one element type is ZodAny/ZodUnknown, the other element type is used

## Future Support

(No items currently planned)

## Note

### In `.templateLiteral`

```ts
const schema = z.templateLiteral(['Value: ', z.undefined()]);
// or
const schema = z.templateLiteral(['Value: ', undefined]);
type Schema = z.infer<typeof schema>;
// typesciprt guess `type Schema = "Value: "`
```

But, zod expect `"Value: undefined"`, so, this library would generate `Value: undefined`

### Branded types

In Zod v4, `brand()` is a type-level concept. There is no special brand class exposed at runtime, so generated values follow the inner schema (e.g., `z.string().brand<'UserId'>()` generates a `string`). Meanwhile, thanks to the overload `initGenerator().generate<T extends z.ZodTypeAny>(schema: T): z.infer<T>`, the returned value type is inferred with the brand.

```ts
const BrandedUserId = z.string().brand<'UserId'>();
const val = initGenerator().generate(BrandedUserId);
// The type is inferred as branded
type T = z.infer<typeof BrandedUserId>;
const _: T = val; // OK
```
