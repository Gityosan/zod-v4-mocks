import { z } from 'zod';

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
  if (schema instanceof z.ZodObject) return {};
  if (schema instanceof z.ZodRecord) return {};
  if (schema instanceof z.ZodArray) return [];
  if (schema instanceof z.ZodTuple) return [];
  if (schema instanceof z.ZodMap) return new Map();
  if (schema instanceof z.ZodSet) return new Set();
  return undefined;
}
