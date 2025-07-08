# zod-v4-mocks

Mock generator for zod v4

## Installation

```bash
npm install zod-v4-mocks
```

## Basic Usage

```ts
import { initGenerator } from 'zod-v4-mocks';
import { z } from 'zod/v4';

const schema = z.string();

const generator = initGenerator({ seed: 1 });
const res = generator.generate(schema);
console.log(schema.parse(res));
```

## Usage Details

Please see [examples](./examples/function-based-usage.ts)

## Unsupported Schemas

- `z.ZodCustom`
  - `.custom()` and `.instanceof()` are not supported
  - `.refine()` and `.check()` are ignored
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
