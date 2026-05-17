import { z } from 'zod';
import { isZodJsonSchema, safeInstanceof } from './schema';

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

/**
 * Outcome of a pre-flight walk.
 *
 * `fixes` maps a problematic schema to a minimally-changed replacement.
 * The generator substitutes any schema found in this map before
 * generating, so a warning-level issue is auto-corrected rather than
 * left to fail.
 */
export type PreflightResult = {
  diagnostics: PreflightDiagnostic[];
  fixes: Map<z.core.$ZodType, z.core.$ZodType>;
};

type WalkState = PreflightContext & {
  diagnostics: PreflightDiagnostic[];
  fixes: Map<z.core.$ZodType, z.core.$ZodType>;
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

/**
 * Detect a `z.lazy()` that is its own recursion anchor and register a
 * minimal auto-fix.
 *
 * The depth limiter tracks object/array/record/etc. references, not
 * `z.lazy()`. When a recursion cycles back through a `z.lazy()` whose
 * getter rebuilds a fresh schema each call, nothing in the cycle is
 * depth-tracked and generation would never terminate.
 *
 * The fix substitutes the lazy with a single cached unwrap of itself: a
 * concrete, stable schema the depth limiter *can* track. Generation
 * proceeds with that substitution applied.
 */
function detectRecursiveLazy(
  schema: z.core.$ZodType,
  path: string,
  state: WalkState,
): void {
  if (!safeInstanceof(schema, z.ZodLazy)) return; // anchored on a tracked type
  if (state.fixes.has(schema)) return; // already handled
  // z.json() is a recursive lazy but the generator handles it specially —
  // leave it untouched.
  if (isZodJsonSchema(schema, schema.unwrap())) return;
  // A getter returning the same reference twice is depth-trackable via that
  // stable inner schema; a fresh-each-call getter is not.
  let stableGetter = false;
  try {
    stableGetter = schema.unwrap() === schema.unwrap();
  } catch {
    stableGetter = false;
  }
  if (stableGetter) return;
  // Cache one unwrap as the stable replacement.
  state.fixes.set(schema, schema.unwrap());
  state.diagnostics.push({
    level: 'warning',
    path: path || '(root)',
    message:
      'A recursive z.lazy() is its own recursion anchor. It has been ' +
      'auto-substituted with its unwrapped form so the depth limiter can ' +
      'track it and generation terminates. For a clearer schema, make a ' +
      'concrete type the stable anchor, e.g. ' +
      '`z.object({ ..., children: z.lazy(() => z.array(Self)) })`.',
  });
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
  if (ancestors.has(schema)) {
    // A cycle closing back onto a z.lazy() would not terminate during
    // generation — register an auto-fix.
    detectRecursiveLazy(schema, path, state);
    return;
  }
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
 * Walk a schema tree before generation. Reports constructs the library
 * cannot safely mock and collects minimal auto-fixes for the recoverable
 * (warning-level) ones.
 */
export function runPreflight(
  rootSchema: z.core.$ZodType,
  context: PreflightContext,
): PreflightResult {
  const state: WalkState = {
    ...context,
    diagnostics: [],
    fixes: new Map(),
  };
  walk(rootSchema, '', false, new Set(), state);
  return { diagnostics: state.diagnostics, fixes: state.fixes };
}
