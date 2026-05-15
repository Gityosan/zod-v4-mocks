import { z } from 'zod';
import { safeInstanceof } from './schema';

export type PreflightDiagnostic = {
  level: 'error' | 'warning';
  path: string;
  message: string;
};

export type PreflightContext = {
  customMockKey: string;
  supplyRefTargets: Set<z.core.$ZodType>;
  hasOpaqueCustomizer: boolean;
};

type WalkState = PreflightContext & {
  diagnostics: PreflightDiagnostic[];
};

function isPlainCustom(schema: z.core.$ZodType): boolean {
  // ZodCustomStringFormat also reports as a custom type but is fully
  // handled by the generator — exclude it first to avoid a false positive.
  if (safeInstanceof(schema, z.ZodCustomStringFormat)) return false;
  return safeInstanceof(schema, z.ZodCustom);
}

function hasMockMeta(schema: z.core.$ZodType, key: string): boolean {
  if (!('meta' in schema) || typeof schema.meta !== 'function') return false;
  const meta = (schema as z.ZodType).meta();
  return meta?.[key] !== undefined;
}

function hasUnwrap(
  schema: z.core.$ZodType,
): schema is z.core.$ZodType & { unwrap: () => z.core.$ZodType } {
  return (
    'unwrap' in schema &&
    typeof (schema as { unwrap?: unknown }).unwrap === 'function'
  );
}

function walk(
  schema: z.core.$ZodType,
  path: string,
  inTupleSlot: boolean,
  ancestors: Set<z.core.$ZodType>,
  state: WalkState,
): void {
  // --- check: un-mocked z.custom() at a fixed-length tuple position ---
  if (isPlainCustom(schema) && inTupleSlot) {
    const covered =
      hasMockMeta(schema, state.customMockKey) ||
      state.supplyRefTargets.has(schema);
    if (!covered) {
      state.diagnostics.push({
        level: state.hasOpaqueCustomizer ? 'warning' : 'error',
        path: path || '(root)',
        message:
          'z.custom()/z.instanceof() sits at a tuple position. Tuples have a ' +
          'fixed length, so an un-mocked custom schema leaves an invalid slot. ' +
          `Add .meta({ ${state.customMockKey}: ... }) or use supplyRef().`,
      });
    }
  }

  // Cycle guard — lazy schemas and getter-based circular references.
  if (ancestors.has(schema)) return;
  ancestors.add(schema);
  try {
    if (safeInstanceof(schema, z.ZodObject)) {
      for (const [key, child] of Object.entries(schema.shape)) {
        walk(child, path ? `${path}.${key}` : key, false, ancestors, state);
      }
      return;
    }
    if (safeInstanceof(schema, z.ZodArray)) {
      walk(schema.element, `${path}[]`, false, ancestors, state);
      return;
    }
    if (safeInstanceof(schema, z.ZodTuple)) {
      schema.def.items.forEach((item, i) => {
        walk(item, `${path}[${i}]`, true, ancestors, state);
      });
      return;
    }
    if (safeInstanceof(schema, z.ZodRecord)) {
      walk(schema.keyType, `${path}[key]`, false, ancestors, state);
      walk(schema.valueType, `${path}[*]`, false, ancestors, state);
      return;
    }
    if (safeInstanceof(schema, z.ZodMap)) {
      walk(schema.keyType, `${path}[key]`, false, ancestors, state);
      walk(schema.valueType, `${path}[*]`, false, ancestors, state);
      return;
    }
    if (safeInstanceof(schema, z.ZodSet)) {
      walk(schema.def.valueType, `${path}[*]`, false, ancestors, state);
      return;
    }
    if (
      safeInstanceof(schema, z.ZodUnion) ||
      safeInstanceof(schema, z.ZodDiscriminatedUnion) ||
      safeInstanceof(schema, z.ZodXor)
    ) {
      schema.options.forEach((opt, i) => {
        walk(opt, `${path}|${i}`, inTupleSlot, ancestors, state);
      });
      return;
    }
    if (safeInstanceof(schema, z.ZodIntersection)) {
      walk(schema.def.left, `${path}&L`, inTupleSlot, ancestors, state);
      walk(schema.def.right, `${path}&R`, inTupleSlot, ancestors, state);
      return;
    }
    if (safeInstanceof(schema, z.ZodPipe)) {
      walk(schema.in, path, inTupleSlot, ancestors, state);
      walk(schema.out, path, inTupleSlot, ancestors, state);
      return;
    }
    if (safeInstanceof(schema, z.ZodCodec)) {
      walk(schema.def.in, path, inTupleSlot, ancestors, state);
      return;
    }
    // Wrappers (optional / nullable / default / prefault / readonly /
    // nonoptional / catch / success / lazy) — transparent for OMIT flow.
    if (hasUnwrap(schema)) {
      walk(schema.unwrap(), path, inTupleSlot, ancestors, state);
      return;
    }
    // Anything else is a leaf — nothing to recurse into.
  } finally {
    ancestors.delete(schema);
  }
}

/**
 * Walk a schema tree before generation and report constructs the library
 * cannot safely mock. Returns a (possibly empty) list of diagnostics.
 */
export function runPreflight(
  rootSchema: z.core.$ZodType,
  context: PreflightContext,
): PreflightDiagnostic[] {
  const state: WalkState = { ...context, diagnostics: [] };
  walk(rootSchema, '', false, new Set(), state);
  return state.diagnostics;
}
