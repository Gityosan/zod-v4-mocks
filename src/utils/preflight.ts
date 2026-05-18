import { z } from 'zod';
import {
  isZodCheckEndsWith,
  isZodCheckLengthEquals,
  isZodCheckLowerCase,
  isZodCheckRegex,
  isZodCheckStartsWith,
  isZodCheckUpperCase,
  isZodJsonSchema,
  safeInstanceof,
} from './schema';

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

// --- shared helpers --------------------------------------------------------

function hasUnwrap(
  schema: z.core.$ZodType,
): schema is z.core.$ZodType & { unwrap: () => z.core.$ZodType } {
  return (
    'unwrap' in schema &&
    typeof (schema as { unwrap?: unknown }).unwrap === 'function'
  );
}

/** Strip wrapper schemas (optional/nullable/default/readonly/lazy/...) to the core. */
function coreOf(schema: z.core.$ZodType): z.core.$ZodType {
  let current = schema;
  for (let i = 0; i < 20 && hasUnwrap(current); i++) {
    const next = current.unwrap();
    if (next === current) break;
    current = next;
  }
  return current;
}

function getChecks(schema: z.core.$ZodType): z.core.$ZodCheck<never>[] {
  const def = schema._zod.def as { checks?: z.core.$ZodCheck<never>[] };
  return def.checks ?? [];
}

/** Error level, downgraded to a warning when an opaque customizer is present. */
function level(state: WalkState): 'error' | 'warning' {
  return state.hasOpaqueCustomizer ? 'warning' : 'error';
}

type Category =
  | 'any'
  | 'string'
  | 'number'
  | 'boolean'
  | 'bigint'
  | 'date'
  | 'symbol'
  | 'objectish'
  | 'arrayish'
  | 'map'
  | 'set'
  | 'enum'
  | 'literal'
  | 'complex';

/** Classify an already-cored schema for intersection compatibility. */
function categoryOf(coreSchema: z.core.$ZodType): Category {
  const t = coreSchema._zod.def.type;
  if (t === 'any' || t === 'unknown') return 'any';
  if (t === 'object' || t === 'record') return 'objectish';
  if (t === 'array' || t === 'tuple') return 'arrayish';
  if (
    t === 'string' ||
    t === 'number' ||
    t === 'boolean' ||
    t === 'bigint' ||
    t === 'date' ||
    t === 'symbol' ||
    t === 'map' ||
    t === 'set' ||
    t === 'enum' ||
    t === 'literal'
  ) {
    return t;
  }
  return 'complex';
}

// --- node checks -----------------------------------------------------------

type NodeCheck = (
  schema: z.core.$ZodType,
  path: string,
  inTupleSlot: boolean,
  state: WalkState,
) => void;

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

/** An un-mocked z.custom()/z.instanceof() at a fixed-length tuple position. */
const checkCustomInTuple: NodeCheck = (schema, path, inTupleSlot, state) => {
  if (!isPlainCustom(schema) || !inTupleSlot) return;
  const covered =
    hasMockMeta(schema, state.customMockKey) ||
    state.supplyRefTargets.has(schema);
  if (covered) return;
  state.diagnostics.push({
    level: level(state),
    path: path || '(root)',
    message:
      'z.custom()/z.instanceof() sits at a tuple position. Tuples have a ' +
      'fixed length, so an un-mocked custom schema leaves an invalid slot. ' +
      `Add .meta({ ${state.customMockKey}: ... }) or use supplyRef().`,
  });
};

/** `.refine()` / `.superRefine()` predicates the generator silently drops. */
const checkIgnoredRefinements: NodeCheck = (schema, path, _inTuple, state) => {
  const hasRefinement = getChecks(schema).some(
    (c) => c._zod.def.check === 'custom',
  );
  if (!hasRefinement) return;
  state.diagnostics.push({
    level: 'warning',
    path: path || '(root)',
    message:
      'A .refine() / .superRefine() predicate is ignored during mock ' +
      'generation, so the generated value may not satisfy it. Pin a valid ' +
      'value with supplyPath()/supplyRef() if the mock must pass .parse().',
  });
};

const KEYABLE_TYPES = new Set([
  'string',
  'number',
  'symbol',
  'enum',
  'literal',
  'template_literal',
]);

function isKeyableKeyType(keyType: z.core.$ZodType): boolean {
  const core = coreOf(keyType);
  if (safeInstanceof(core, z.ZodUnion)) {
    return core.options.every((o) => isKeyableKeyType(o));
  }
  return KEYABLE_TYPES.has(core._zod.def.type);
}

/** A z.record() whose key type cannot produce a string/number/symbol. */
const checkRecordKeyType: NodeCheck = (schema, path, _inTuple, state) => {
  if (!safeInstanceof(schema, z.ZodRecord)) return;
  if (isKeyableKeyType(schema.keyType)) return;
  state.diagnostics.push({
    level: level(state),
    path: path || '(root)',
    message:
      `z.record() key type '${coreOf(schema.keyType)._zod.def.type}' cannot ` +
      'be a record key — generation expects string / number / symbol. ' +
      'Use z.string()/z.number()/z.enum()/z.literal() as the key type.',
  });
};

function numberBounds(schema: z.core.$ZodType): { min: number; max: number } {
  const s = schema as { minValue?: number | null; maxValue?: number | null };
  return {
    min: s.minValue ?? Number.NEGATIVE_INFINITY,
    max: s.maxValue ?? Number.POSITIVE_INFINITY,
  };
}

function enumLiteralValues(schema: z.core.$ZodType): unknown[] | null {
  if (safeInstanceof(schema, z.ZodEnum)) return [...schema.options];
  if (safeInstanceof(schema, z.ZodLiteral)) return [...schema.values];
  return null;
}

/** A z.intersection() of structurally incompatible schemas. */
const checkIntersectionCompat: NodeCheck = (schema, path, _inTuple, state) => {
  if (!safeInstanceof(schema, z.ZodIntersection)) return;
  const left = coreOf(schema.def.left);
  const right = coreOf(schema.def.right);
  const cl = categoryOf(left);
  const cr = categoryOf(right);
  // any/unknown is compatible with anything; complex types are not judged.
  if (cl === 'any' || cr === 'any' || cl === 'complex' || cr === 'complex') {
    return;
  }
  const here = path || '(root)';
  if (cl !== cr) {
    state.diagnostics.push({
      level: level(state),
      path: here,
      message:
        `z.intersection() of incompatible types: '${cl}' & '${cr}'. ` +
        'No single value can satisfy both sides.',
    });
    return;
  }
  // Same category — look for an empty result set.
  if (cl === 'enum' || cl === 'literal') {
    const lv = enumLiteralValues(left);
    const rv = enumLiteralValues(right);
    if (lv && rv && !lv.some((v) => rv.includes(v))) {
      state.diagnostics.push({
        level: level(state),
        path: here,
        message:
          `z.intersection() of ${cl}s with no common value. ` +
          'No value can satisfy both sides.',
      });
    }
    return;
  }
  if (cl === 'number') {
    const lb = numberBounds(left);
    const rb = numberBounds(right);
    const min = Math.max(lb.min, rb.min);
    const max = Math.min(lb.max, rb.max);
    if (min > max) {
      state.diagnostics.push({
        level: 'warning',
        path: here,
        message:
          `z.intersection() of numbers with a disjoint range ` +
          `(combined min ${min} > max ${max}). The mock will not pass .parse().`,
      });
    }
  }
};

/**
 * A number/bigint schema with an unsatisfiable min > max range.
 * (A string with minLength > maxLength cannot be constructed — Zod itself
 * throws while building the length regex — so it needs no check here.)
 */
const checkUnsatisfiableRange: NodeCheck = (schema, path, _inTuple, state) => {
  const report = (kind: string, lo: number | bigint, hi: number | bigint) => {
    state.diagnostics.push({
      level: 'warning',
      path: path || '(root)',
      message:
        `Unsatisfiable ${kind} range (min ${lo} > max ${hi}). No value can ` +
        'satisfy the schema, so the generated mock will not pass .parse().',
    });
  };
  if (safeInstanceof(schema, z.ZodNumber)) {
    const { minValue, maxValue } = schema;
    if (minValue != null && maxValue != null && minValue > maxValue) {
      report('number', minValue, maxValue);
    }
  } else if (safeInstanceof(schema, z.ZodBigInt)) {
    const { minValue, maxValue } = schema;
    if (minValue != null && maxValue != null && minValue > maxValue) {
      report('bigint', minValue, maxValue);
    }
  }
};

/** A z.string() carrying multiple competing checks of the same kind. */
const checkConflictingStringChecks: NodeCheck = (
  schema,
  path,
  _inTuple,
  state,
) => {
  if (!safeInstanceof(schema, z.ZodString)) return;
  const checks = schema.def.checks ?? [];
  const conflicts: string[] = [];
  if (checks.filter(isZodCheckRegex).length > 1) conflicts.push('regex');
  if (checks.filter(isZodCheckLengthEquals).length > 1) {
    conflicts.push('length');
  }
  if (checks.filter(isZodCheckStartsWith).length > 1) {
    conflicts.push('startsWith');
  }
  if (checks.filter(isZodCheckEndsWith).length > 1) {
    conflicts.push('endsWith');
  }
  const caseCount = checks.filter(
    (c) => isZodCheckUpperCase(c) || isZodCheckLowerCase(c),
  ).length;
  if (caseCount > 1) conflicts.push('uppercase/lowercase');
  if (conflicts.length === 0) return;
  state.diagnostics.push({
    level: 'warning',
    path: path || '(root)',
    message:
      `z.string() has multiple ${conflicts.join(', ')} check(s). Only the ` +
      'last of each kind is applied, so the value may fail .parse().',
  });
};

/**
 * Schema `def.type` values the generator handles. `discriminatedUnion`/`xor`
 * report `union`; `codec`/`transform`/`stringbool` report `pipe`; the string
 * formats (email/url/uuid/iso...) report `string`.
 */
const SUPPORTED_TYPES = new Set<string>([
  'string', 'number', 'boolean', 'bigint', 'date', 'nan', 'symbol', 'file',
  'null', 'undefined', 'void', 'any', 'unknown',
  'literal', 'enum', 'template_literal',
  'array', 'tuple', 'object', 'record', 'map', 'set',
  'union', 'intersection',
  'optional', 'nonoptional', 'exactOptional', 'nullable',
  'default', 'prefault', 'readonly',
  'lazy', 'pipe', 'catch', 'success', 'custom', 'never',
]);

/** A schema type the generator does not support. */
const checkUnsupportedType: NodeCheck = (schema, path, _inTuple, state) => {
  const type = schema._zod.def.type;
  if (SUPPORTED_TYPES.has(type)) return;
  let message: string;
  if (type === 'function') {
    message = 'z.function() is not supported — function mocks are out of scope.';
  } else if (type === 'promise') {
    message = 'z.promise() is deprecated in Zod v4 and is not supported.';
  } else {
    message =
      `Schema type '${type}' is not recognized by this version of ` +
      'zod-v4-mocks; the generated value may be incorrect.';
  }
  state.diagnostics.push({ level: 'warning', path: path || '(root)', message });
};

const NODE_CHECKS: NodeCheck[] = [
  checkCustomInTuple,
  checkIgnoredRefinements,
  checkRecordKeyType,
  checkIntersectionCompat,
  checkUnsatisfiableRange,
  checkConflictingStringChecks,
  checkUnsupportedType,
];

/**
 * Detect a `z.lazy()` that is its own recursion anchor and register a
 * minimal auto-fix (substitute the lazy with a single cached unwrap of
 * itself — a concrete, depth-trackable schema).
 */
function detectRecursiveLazy(
  schema: z.core.$ZodType,
  path: string,
  state: WalkState,
): void {
  if (!safeInstanceof(schema, z.ZodLazy)) return; // anchored on a tracked type
  if (state.fixes.has(schema)) return; // already handled
  // `unwrap()` re-runs the lazy getter — call it just twice: one captured
  // reference plus a second only to test getter stability.
  let inner: z.core.$ZodType;
  let second: z.core.$ZodType;
  try {
    inner = schema.unwrap();
    second = schema.unwrap();
  } catch {
    return; // cannot unwrap — not actionable
  }
  // z.json() is a recursive lazy but the generator handles it specially.
  if (isZodJsonSchema(schema, inner)) return;
  // A getter returning the same reference twice is depth-trackable via that
  // stable inner schema; a fresh-each-call getter is not.
  if (inner === second) return;
  state.fixes.set(schema, inner);
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
  for (const check of NODE_CHECKS) {
    check(schema, path, inTupleSlot, state);
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
    if (
      safeInstanceof(schema, z.ZodRecord) ||
      safeInstanceof(schema, z.ZodMap)
    ) {
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

function dedupeDiagnostics(
  diagnostics: PreflightDiagnostic[],
): PreflightDiagnostic[] {
  const seen = new Set<string>();
  const out: PreflightDiagnostic[] = [];
  for (const d of diagnostics) {
    const key = `${d.level}|${d.path}|${d.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(d);
  }
  return out;
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
  return {
    diagnostics: dedupeDiagnostics(state.diagnostics),
    fixes: state.fixes,
  };
}
