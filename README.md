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

- z.refine() / z.superRefine() / z.check() (refinement validations)
- z.function() (no longer returns a Zod schema in v4)
- z.instanceof() (instance validation)
- z.custom() (custom validation)
- z.catch() (fallback values on parse errors)
- z.nativeEnum() (z.ZodNativeEnum) (deprecated in v4)
- z.promise() (z.ZodPromise) (deprecated in v4)
