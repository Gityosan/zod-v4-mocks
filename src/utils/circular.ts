import { z } from 'zod';
import { safeInstanceof } from './schema';

const CIRCULAR_SCHEMA_TYPES = new Set([
  'object',
  'record',
  'array',
  'tuple',
  'map',
  'set',
  // `lazy` is tracked too: a recursive schema whose only stable anchor is
  // the `z.lazy()` itself (e.g. `z.lazy(() => z.object({ children:
  // z.array(Self) }))`) would otherwise never hit the depth limit, since
  // the lazy getter rebuilds a fresh object on every unwrap.
  'lazy',
]);

export function isCircularRefSchema(schema: z.core.$ZodType): boolean {
  return CIRCULAR_SCHEMA_TYPES.has(schema._zod.def.type);
}

export function getEmptyValueForSchema(schema: z.core.$ZodType): unknown {
  if (safeInstanceof(schema, z.ZodObject)) return {};
  if (safeInstanceof(schema, z.ZodRecord)) return {};
  if (safeInstanceof(schema, z.ZodArray)) return [];
  if (safeInstanceof(schema, z.ZodTuple)) return [];
  if (safeInstanceof(schema, z.ZodMap)) return new Map();
  if (safeInstanceof(schema, z.ZodSet)) return new Set();
  // For a depth-limited `z.lazy()`, fall back to the inner schema's empty
  // value so the terminator matches the unwrapped shape.
  if (safeInstanceof(schema, z.ZodLazy)) {
    return getEmptyValueForSchema(schema.unwrap());
  }
  return undefined;
}
