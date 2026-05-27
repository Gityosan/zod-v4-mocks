import {
  deserialize,
  serialize,
  serializeAsync,
  SerovalUnsupportedTypeError,
  type Plugin,
} from 'seroval';
import {
  BlobPlugin,
  FilePlugin,
  FormDataPlugin,
  HeadersPlugin,
  URLPlugin,
  URLSearchParamsPlugin,
} from 'seroval-plugins/web';

/**
 * Web-platform types seroval core does not handle on its own. These plugins
 * emit self-contained reconstruction code, so `deserialize` (which does not
 * re-run plugins) can rebuild them in any runtime that has the global.
 *
 * Note: `File`, `Blob`, and `FormData` carry bytes that are read
 * asynchronously, so they only round-trip through `serializePortableAsync`.
 */
const PLUGINS: Plugin<any, any>[] = [
  // FilePlugin before BlobPlugin: File extends Blob, so the more specific
  // test must run first or a File would be captured as a plain Blob.
  FilePlugin,
  BlobPlugin,
  FormDataPlugin,
  HeadersPlugin,
  URLPlugin,
  URLSearchParamsPlugin,
];

// --- Symbol support -------------------------------------------------------
//
// seroval routes `typeof === 'symbol'` straight to its well-known-symbol
// handler and throws for anything else — plugins never see symbol primitives.
// So symbols are handled out-of-band: boxed into plain marker objects before
// serialization and unboxed afterwards. Well-known symbols (Symbol.iterator …)
// are left to seroval. A described symbol's cross-runtime identity cannot be
// preserved (it is unique by definition), but its description and any identity
// *shared within a single payload* are.

const SYMBOL_MARKER = '$$zod-v4-mocks/symbol$$';

const WELL_KNOWN_SYMBOLS = new Set<symbol>(
  Object.getOwnPropertyNames(Symbol)
    .map((name) => (Symbol as unknown as Record<string, unknown>)[name])
    .filter((value): value is symbol => typeof value === 'symbol'),
);

/** Registry or described symbol (not well-known) — the kinds we box. */
function isBoxableSymbol(value: unknown): value is symbol {
  return typeof value === 'symbol' && !WELL_KNOWN_SYMBOLS.has(value);
}

/** Only plain objects (no custom prototype) are descended into. */
function isPlainObject(value: object): boolean {
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Containers we walk for symbols. Everything else (Date, RegExp, TypedArray,
 * Blob/File, URL, class instances, …) passes through untouched so seroval and
 * its plugins handle it.
 */
function isTraversable(value: unknown): value is object {
  return (
    typeof value === 'object' &&
    value !== null &&
    (Array.isArray(value) ||
      value instanceof Map ||
      value instanceof Set ||
      isPlainObject(value))
  );
}

/** Fast pre-scan: is there any boxable symbol anywhere in `value`? */
function containsBoxableSymbol(value: unknown, seen: Set<unknown>): boolean {
  if (isBoxableSymbol(value)) return true;
  if (!isTraversable(value) || seen.has(value)) return false;
  seen.add(value);
  if (Array.isArray(value)) {
    return value.some((v) => containsBoxableSymbol(v, seen));
  }
  if (value instanceof Map) {
    for (const [k, v] of value) {
      if (containsBoxableSymbol(k, seen) || containsBoxableSymbol(v, seen)) {
        return true;
      }
    }
    return false;
  }
  if (value instanceof Set) {
    for (const v of value) if (containsBoxableSymbol(v, seen)) return true;
    return false;
  }
  return Object.keys(value).some((k) =>
    containsBoxableSymbol((value as Record<string, unknown>)[k], seen),
  );
}

function makeSymbolMarker(sym: symbol): Record<string, [string, string | undefined]> {
  const key = Symbol.keyFor(sym);
  return {
    [SYMBOL_MARKER]: key !== undefined ? ['for', key] : ['desc', sym.description],
  };
}

/** A marker object → its reconstructed symbol, or `undefined` if not a marker. */
function readSymbolMarker(value: object): symbol | undefined {
  const keys = Object.keys(value);
  if (keys.length !== 1 || keys[0] !== SYMBOL_MARKER) return undefined;
  const payload = (value as Record<string, unknown>)[SYMBOL_MARKER];
  if (!Array.isArray(payload) || payload.length !== 2) return undefined;
  const [kind, key] = payload as [unknown, unknown];
  if (kind === 'for' && typeof key === 'string') return Symbol.for(key);
  if (kind === 'desc') return Symbol(key as string | undefined);
  return undefined;
}

/** Replace boxable symbols with marker objects, preserving cycles & sharing. */
function boxSymbols(
  value: unknown,
  seen: Map<object, unknown>,
  symbols: Map<symbol, unknown>,
): unknown {
  if (isBoxableSymbol(value)) {
    let marker = symbols.get(value);
    if (marker === undefined) {
      marker = makeSymbolMarker(value);
      symbols.set(value, marker);
    }
    return marker;
  }
  if (!isTraversable(value)) return value;
  if (seen.has(value)) return seen.get(value);
  if (Array.isArray(value)) {
    const out: unknown[] = [];
    seen.set(value, out);
    for (const v of value) out.push(boxSymbols(v, seen, symbols));
    return out;
  }
  if (value instanceof Map) {
    const out = new Map<unknown, unknown>();
    seen.set(value, out);
    for (const [k, v] of value) {
      out.set(boxSymbols(k, seen, symbols), boxSymbols(v, seen, symbols));
    }
    return out;
  }
  if (value instanceof Set) {
    const out = new Set<unknown>();
    seen.set(value, out);
    for (const v of value) out.add(boxSymbols(v, seen, symbols));
    return out;
  }
  const out: Record<string, unknown> = {};
  seen.set(value, out);
  for (const k of Object.keys(value)) {
    out[k] = boxSymbols((value as Record<string, unknown>)[k], seen, symbols);
  }
  return out;
}

/** Inverse of `boxSymbols`: marker objects become symbols again. */
function unboxSymbols(
  value: unknown,
  seen: Map<object, unknown>,
  markers: Map<object, symbol>,
): unknown {
  if (!isTraversable(value)) return value;
  if (isPlainObject(value)) {
    const cachedSym = markers.get(value);
    if (cachedSym !== undefined) return cachedSym;
    const sym = readSymbolMarker(value);
    if (sym !== undefined) {
      markers.set(value, sym);
      return sym;
    }
  }
  if (seen.has(value)) return seen.get(value);
  if (Array.isArray(value)) {
    const out: unknown[] = [];
    seen.set(value, out);
    for (const v of value) out.push(unboxSymbols(v, seen, markers));
    return out;
  }
  if (value instanceof Map) {
    const out = new Map<unknown, unknown>();
    seen.set(value, out);
    for (const [k, v] of value) {
      out.set(unboxSymbols(k, seen, markers), unboxSymbols(v, seen, markers));
    }
    return out;
  }
  if (value instanceof Set) {
    const out = new Set<unknown>();
    seen.set(value, out);
    for (const v of value) out.add(unboxSymbols(v, seen, markers));
    return out;
  }
  const out: Record<string, unknown> = {};
  seen.set(value, out);
  for (const k of Object.keys(value)) {
    out[k] = unboxSymbols((value as Record<string, unknown>)[k], seen, markers);
  }
  return out;
}

export type PortableOptions = {
  /**
   * Base64-encode the serialized string so it is safe to embed in places that
   * only accept plain text (JSON fields, env vars, HTTP headers, git
   * snapshots). The same flag must be passed to `deserializePortable`.
   * @default false
   */
  base64?: boolean;
};

/** Walk an error's `cause` chain for the value seroval rejected. */
function findUnsupportedValue(error: unknown): { found: boolean; value: unknown } {
  let current: unknown = error;
  const seen = new Set<unknown>();
  while (current && typeof current === 'object' && !seen.has(current)) {
    seen.add(current);
    if (current instanceof SerovalUnsupportedTypeError) {
      return { found: true, value: current.value };
    }
    current = (current as { cause?: unknown }).cause;
  }
  return { found: false, value: undefined };
}

/** `File`/`Blob`/`FormData` carry bytes read asynchronously (async-only). */
function isAsyncOnly(value: unknown): boolean {
  return (
    (typeof Blob !== 'undefined' && value instanceof Blob) ||
    (typeof FormData !== 'undefined' && value instanceof FormData)
  );
}

/**
 * Turn seroval's generic "cannot be parsed/serialized" error into actionable
 * guidance for the cases this library can hit, otherwise return it untouched.
 */
function toFriendlyError(error: unknown, context: 'sync' | 'async'): unknown {
  const { found, value } = findUnsupportedValue(error);
  if (found && context === 'sync' && isAsyncOnly(value)) {
    return new Error(
      `serializePortable: File/Blob/FormData carry bytes read asynchronously. ` +
        `Use serializePortableAsync() instead.`,
      { cause: error },
    );
  }
  return error;
}

/** UTF-8-safe base64 that works in both Node and browsers. */
function toBase64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(input: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(input, 'base64').toString('utf-8');
  }
  const binary = atob(input);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/**
 * Serialize data to a portable string using seroval's structured-clone-style
 * encoding. Unlike `serializeBinary` (Node-only `v8`), the output round-trips
 * across any JS runtime — Node↔browser and browser↔browser — and preserves
 * `Date`, `RegExp`, `Map`, `Set`, `BigInt`, `TypedArray`, `undefined`,
 * `NaN`/`Infinity`, circular/shared references, and (via the bundled plugins)
 * `URL`, `URLSearchParams`, and `Headers`.
 *
 * `Symbol` is supported transparently: registry symbols (`Symbol.for`)
 * round-trip with identity intact; described symbols (`Symbol('x')`, e.g.
 * `z.symbol()`) round-trip by description, with identity preserved among
 * references *within the same payload*. Symbols used as object property *keys*
 * are not preserved — only as values, Map keys, and Set members.
 *
 * `File`, `Blob`, and `FormData` require async byte access — use
 * `serializePortableAsync` for those.
 */
export function serializePortable(
  data: unknown,
  options?: PortableOptions,
): string {
  const payload = containsBoxableSymbol(data, new Set())
    ? boxSymbols(data, new Map(), new Map())
    : data;
  let serialized: string;
  try {
    serialized = serialize(payload, { plugins: PLUGINS });
  } catch (error) {
    throw toFriendlyError(error, 'sync');
  }
  return options?.base64 ? toBase64(serialized) : serialized;
}

/**
 * Async variant of `serializePortable` that additionally supports `File`,
 * `Blob`, and `FormData` (their contents are read asynchronously).
 */
export async function serializePortableAsync(
  data: unknown,
  options?: PortableOptions,
): Promise<string> {
  const payload = containsBoxableSymbol(data, new Set())
    ? boxSymbols(data, new Map(), new Map())
    : data;
  let serialized: string;
  try {
    serialized = await serializeAsync(payload, { plugins: PLUGINS });
  } catch (error) {
    throw toFriendlyError(error, 'async');
  }
  return options?.base64 ? toBase64(serialized) : serialized;
}

/**
 * Deserialize a string produced by `serializePortable` /
 * `serializePortableAsync` back into the original value. Runs in any JS
 * runtime. Pass `{ base64: true }` if it was encoded that way.
 *
 * Note: the string path evaluates the serialized expression, so only feed it
 * data you produced yourself — never untrusted input.
 */
export function deserializePortable<T = unknown>(
  input: string,
  options?: PortableOptions,
): T {
  const source = options?.base64 ? fromBase64(input) : input;
  const value = deserialize<unknown>(source);
  // Fast path: only walk to unbox when a marker is actually present.
  if (!source.includes(SYMBOL_MARKER)) return value as T;
  return unboxSymbols(value, new Map(), new Map()) as T;
}
