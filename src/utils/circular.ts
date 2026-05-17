import { z } from 'zod';
import { safeInstanceof } from './schema';

const CIRCULAR_SCHEMA_TYPES = new Set([
  'object',
  'record',
  'array',
  'tuple',
  'map',
  'set',
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
  return undefined;
}
