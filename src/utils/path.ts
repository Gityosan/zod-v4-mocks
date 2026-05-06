export type PathSegment = string | number | symbol;

export type ChildStep =
  | { kind: 'objectKey'; key: string | symbol }
  | { kind: 'arrayIndex'; index: number }
  | { kind: 'tupleIndex'; index: number }
  | { kind: 'recordKey'; key: string | number | symbol }
  | { kind: 'mapKey'; key: unknown }
  | { kind: 'setItem' };

export const ITEM_MARKER = '$item';
export const VALUE_MARKER = '$value';

export type PathSupply = {
  /** Remaining segments still to traverse. */
  remaining: PathSegment[];
  /** Original supplied path (kept for diagnostics / specificity). */
  original: PathSegment[];
  value: unknown;
  /** Number of literal (non-marker) segments — higher wins on conflict. */
  specificity: number;
};

export function calcSpecificity(path: PathSegment[]): number {
  let n = 0;
  for (const s of path) {
    if (s !== ITEM_MARKER && s !== VALUE_MARKER) n++;
  }
  return n;
}

export function makePathSupply(
  path: PathSegment[],
  value: unknown,
): PathSupply {
  return {
    remaining: [...path],
    original: [...path],
    value,
    specificity: calcSpecificity(path),
  };
}

function segmentMatchesStep(seg: PathSegment, step: ChildStep): boolean {
  switch (step.kind) {
    case 'objectKey':
      return seg === step.key;
    case 'arrayIndex':
    case 'tupleIndex':
      if (seg === ITEM_MARKER) return true;
      return seg === step.index;
    case 'recordKey':
      if (seg === VALUE_MARKER) return true;
      return seg === step.key;
    case 'mapKey':
      if (seg === VALUE_MARKER) return true;
      // Map keys are matched literally; only string|number|symbol primitives
      // can be expressed via path, complex keys never match.
      return seg === step.key;
    case 'setItem':
      return seg === ITEM_MARKER;
  }
}

export function descendPathSupplies(
  supplies: PathSupply[],
  step: ChildStep,
): PathSupply[] {
  if (supplies.length === 0) return supplies;
  const out: PathSupply[] = [];
  for (const sup of supplies) {
    if (sup.remaining.length === 0) continue;
    const [head, ...rest] = sup.remaining;
    if (segmentMatchesStep(head, step)) {
      out.push({ ...sup, remaining: rest });
    }
  }
  return out;
}

const NO_MATCH = Symbol.for('zod-v4-mocks:path-no-match');
export const PATH_NO_MATCH: typeof NO_MATCH = NO_MATCH;

export function findMatchedValue(supplies: PathSupply[]): unknown {
  let best: PathSupply | undefined;
  for (const sup of supplies) {
    if (sup.remaining.length !== 0) continue;
    if (!best || sup.specificity > best.specificity) best = sup;
  }
  return best ? best.value : NO_MATCH;
}

/**
 * Find supplies targeting specific record/map keys that should be injected
 * even if they aren't randomly generated. Returns supplies whose remaining
 * path is exactly one literal segment (not a marker) compatible with the
 * given key type.
 */
export function findKeyInjections(
  supplies: PathSupply[],
  keyTypeAccepts: (key: PathSegment) => boolean,
): PathSegment[] {
  const keys: PathSegment[] = [];
  const seen = new Set<PathSegment>();
  for (const sup of supplies) {
    if (sup.remaining.length !== 1) continue;
    const k = sup.remaining[0];
    if (k === ITEM_MARKER || k === VALUE_MARKER) continue;
    if (seen.has(k)) continue;
    if (!keyTypeAccepts(k)) continue;
    seen.add(k);
    keys.push(k);
  }
  return keys;
}

/**
 * Find the maximum literal numeric index referenced by remaining path
 * segments. Used by array generator to extend its random length so a
 * targeted index actually exists.
 */
export function findMaxLiteralIndex(supplies: PathSupply[]): number {
  let max = -1;
  for (const sup of supplies) {
    if (sup.remaining.length === 0) continue;
    const head = sup.remaining[0];
    if (typeof head === 'number' && head > max) max = head;
  }
  return max;
}
