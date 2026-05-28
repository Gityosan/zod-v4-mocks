import {
  isBlob,
  isBoolean,
  isDate,
  isFile,
  isMap,
  isNull,
  isNumber,
  isPlainObject,
  isRegExp,
  isSet,
  isString,
  isSymbol,
  isUndefined,
} from 'es-toolkit';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join } from 'node:path';
import { deserialize as v8Deserialize, serialize as v8Serialize } from 'node:v8';
import { z } from 'zod';
import { serializePortableSourceAsync } from './portable';

const outputExtSchema = z.literal(['json', 'js', 'ts']);
type OutputExt = z.infer<typeof outputExtSchema>;

export type OutputOptions = {
  path?: string;
  ext?: OutputExt;
  /**
   * Custom export variable name (default: 'mockData')
   * Only used for 'ts' and 'js' formats.
   * @example 'generatedMockData' → export const generatedMockData = ...
   */
  exportName?: string;
  /**
   * Header string prepended to the output content.
   * Useful for adding import statements or comments.
   * Ignored for 'json' format.
   */
  header?: string;
  /**
   * Footer string appended to the output content.
   * Ignored for 'json' format.
   */
  footer?: string;
  /**
   * When combined with `ext: 'ts'` or `'js'`, writes a v8.serialize binary
   * (`.bin`) alongside the script file. The script itself becomes a thin
   * ESM wrapper that lazily `v8.deserialize`s the sibling `.bin` at import
   * time, preserving `Date`, `Map`, `Set`, `RegExp`, `BigInt`, `TypedArray`,
   * `undefined`, and circular references with no information loss.
   *
   * The wrapper exports the deserialized value as `unknown`. Cast on the
   * consumer side or use `deserialize<T>()` directly if you need typing.
   *
   * Ignored for `ext: 'json'`.
   */
  binary?: boolean;
  /**
   * Honored by `outputAsync` only (it requires async byte access). For
   * `ext: 'ts'`/`'js'`, inlines a self-contained, cross-runtime expression
   * (`export const <name> = <expr>`) produced by seroval — no sibling file and
   * no runtime dependency for consumers, unlike `binary` (Node-only v8).
   * Losslessly preserves File/Blob/FormData (incl. contents), Date, Map, Set,
   * BigInt, TypedArray, circular/shared refs, and URL/URLSearchParams/Headers.
   *
   * `Symbol` is rejected (an inline import has no unbox step); use `ext` ts/js
   * without `portable` for symbol data. Passing `portable` to the sync
   * `output()` throws — use `outputAsync`. Ignored for `ext: 'json'`.
   */
  portable?: boolean;
};

const DEFAULT_OUTPUT_DIR = './__generated__';
const DEFAULT_OUTPUT_FILENAME = 'generated-mock-data';

/**
 * Serialize JavaScript values to executable JS code
 * Handles: primitives, BigInt, Symbol, Date, RegExp, File, Blob, Arrays, Objects, Map, Set
 */
function serializeToJS(value: unknown, indent: number): string {
  const spaces = '  '.repeat(indent);
  const nextIndent = indent + 1;
  const nextSpaces = '  '.repeat(nextIndent);

  if (isNull(value)) return 'null';
  if (isUndefined(value)) return 'undefined';
  if (isBoolean(value)) return String(value);
  if (isNumber(value)) {
    if (Number.isNaN(value)) return 'NaN';
    if (value === Infinity) return 'Infinity';
    if (value === -Infinity) return '-Infinity';
    return String(value);
  }
  if (isString(value)) return JSON.stringify(value);
  if (typeof value === 'bigint') return `${value}n`;
  if (isSymbol(value)) {
    const key = Symbol.keyFor(value);
    if (key !== undefined) return `Symbol.for(${JSON.stringify(key)})`;
    const desc = value.description;
    return desc !== undefined ? `Symbol(${JSON.stringify(desc)})` : 'Symbol()';
  }

  if (isDate(value)) return `new Date(${JSON.stringify(value.toISOString())})`;
  if (isRegExp(value)) return String(value);

  if (isFile(value)) {
    const name = JSON.stringify(value.name);
    if (value.type) {
      return `new File([], ${name}, { type: ${JSON.stringify(value.type)} })`;
    }
    return `new File([], ${name})`;
  }

  if (isBlob(value)) {
    if (value.type) {
      return `new Blob([], { type: ${JSON.stringify(value.type)} })`;
    }
    return `new Blob([])`;
  }

  if (isMap(value)) {
    if (value.size === 0) return 'new Map()';
    const entries = Array.from(value.entries())
      .map(
        ([k, v]) =>
          `[${serializeToJS(k, nextIndent)}, ${serializeToJS(v, nextIndent)}]`,
      )
      .join(`,\n${nextSpaces}`);
    return `new Map([\n${nextSpaces}${entries}\n${spaces}])`;
  }
  if (isSet(value)) {
    if (value.size === 0) return 'new Set()';
    const items = Array.from(value)
      .map((v) => serializeToJS(v, nextIndent))
      .join(`,\n${nextSpaces}`);
    return `new Set([\n${nextSpaces}${items}\n${spaces}])`;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const items = value
      .map((v) => serializeToJS(v, nextIndent))
      .join(`,\n${nextSpaces}`);
    return `[\n${nextSpaces}${items}\n${spaces}]`;
  }

  if (isPlainObject(value)) {
    const keys = Object.keys(value);
    if (keys.length === 0) return '{}';
    const entries = keys
      .map((k) => {
        const v = value[k];
        return `${JSON.stringify(k)}: ${serializeToJS(v, nextIndent)}`;
      })
      .join(`,\n${nextSpaces}`);
    return `{\n${nextSpaces}${entries}\n${spaces}}`;
  }
  return 'undefined';
}

/**
 * Serialize JavaScript values to JSON string with data loss detection
 * Detects and reports data types that lose information in JSON:
 * - BigInt → converted to string
 * - Symbol → omitted
 * - Map/Set → converted to empty object
 * - File/Blob → converted to empty object
 * - NaN/Infinity → converted to null
 */
function serializeToJSON(input: unknown) {
  const lostData: { key: string; type: string; value: string }[] = [];

  function detectDataLoss(obj: unknown, path = '') {
    if (obj === null || obj === undefined) return;
    const key = path || 'root';

    if (typeof obj === 'bigint') {
      lostData.push({ key, type: 'BigInt', value: obj.toString() });
      return;
    }

    if (isSymbol(obj)) {
      lostData.push({ key, type: 'Symbol', value: obj.toString() });
      return;
    }

    if (isNumber(obj)) {
      if (Number.isNaN(obj)) {
        lostData.push({ key, type: 'NaN', value: 'NaN' });
      } else if (obj === Infinity || obj === -Infinity) {
        lostData.push({ key, type: 'Infinity', value: String(obj) });
      }
      return;
    }

    if (isMap(obj)) {
      lostData.push({ key, type: 'Map', value: `Map(${obj.size})` });
      return;
    }

    if (isSet(obj)) {
      lostData.push({ key, type: 'Set', value: `Set(${obj.size})` });
      return;
    }

    if (isFile(obj)) {
      lostData.push({ key, type: 'File', value: `File("${obj.name}")` });
      return;
    }

    if (isBlob(obj)) {
      lostData.push({ key, type: 'Blob', value: `Blob(${obj.size} bytes)` });
      return;
    }

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        detectDataLoss(item, path ? `${path}[${index}]` : `[${index}]`);
      });
      return;
    }

    if (isPlainObject(obj)) {
      Object.entries(obj).forEach(([k, v]) => {
        detectDataLoss(v, path ? `${path}.${k}` : k);
      });
    }
  }

  detectDataLoss(input);

  const json = JSON.stringify(
    input,
    (_key, v) => {
      if (typeof v === 'bigint') {
        return v.toString();
      }
      return v;
    },
    2,
  );

  if (lostData.length > 0) {
    const details = lostData
      .map(({ key, type, value }) => `  - ${key} (${type}): ${value}`)
      .join('\n');
    console.warn(
      `Warning: Some data types cannot be accurately represented in JSON and were converted/omitted:\n${details}\nConsider using .ts or .js format instead.`,
    );
  }

  return json;
}

function getExtFromPath(path?: string) {
  if (!path) return undefined;
  const match = /\.(json|js|ts)$/.exec(path);
  if (!match) return undefined;
  const result = outputExtSchema.safeParse(match[1]);
  return result.success ? result.data : undefined;
}

function wrapperBinRelativeName(outputPath: string): string {
  const base = basename(outputPath, extname(outputPath));
  return `${base}.bin`;
}

function buildBinWrapper(
  outputPath: string,
  options: OutputOptions,
  ext: 'ts' | 'js',
): string {
  const exportName = options.exportName ?? 'mockData';
  const header = options.header ?? '';
  const footer = options.footer ?? '';
  const binRef = wrapperBinRelativeName(outputPath);

  const imports = [
    "import { readFileSync } from 'node:fs';",
    "import { join } from 'node:path';",
    "import { deserialize } from 'node:v8';",
  ].join('\n');

  const body =
    ext === 'ts'
      ? `export const ${exportName}: unknown = deserialize(\n` +
        `  readFileSync(join(import.meta.dirname, ${JSON.stringify(binRef)})),\n` +
        `);\n`
      : `export const ${exportName} = deserialize(\n` +
        `  readFileSync(join(import.meta.dirname, ${JSON.stringify(binRef)})),\n` +
        `);\n`;

  const parts: string[] = [];
  if (header) parts.push(header);
  parts.push(imports);
  parts.push(body);
  if (footer) parts.push(footer);
  return parts.join('\n');
}

function buildContent(
  data: unknown,
  options: Omit<OutputOptions, 'ext'> & { ext: OutputExt },
): string {
  const { ext } = options;

  if (ext === 'json') {
    return serializeToJSON(data);
  }

  const exportName = options.exportName ?? 'mockData';
  const header = options.header ?? '';
  const footer = options.footer ?? '';
  const body = `export const ${exportName} = ${serializeToJS(data, 0)};\n`;

  const parts: string[] = [];
  if (header) parts.push(header);
  parts.push(body);
  if (footer) parts.push(footer);

  return parts.join('\n');
}

/** Wrap an inline seroval source expression as an ESM export (ts/js). */
function buildPortableContent(expr: string, options: OutputOptions): string {
  const exportName = options.exportName ?? 'mockData';
  const header = options.header ?? '';
  const footer = options.footer ?? '';
  const body = `export const ${exportName} = ${expr};\n`;

  const parts: string[] = [];
  if (header) parts.push(header);
  parts.push(body);
  if (footer) parts.push(footer);

  return parts.join('\n');
}

/**
 * Serialize data to a string without writing to a file.
 * Returns the same content that `outputToFile` would write.
 *
 * For 'json' ext: returns pure JSON string (header/footer/exportName are ignored).
 * For 'ts'/'js' ext: returns `export const <exportName> = <serialized>;`
 *
 * Throws if `binary` is true with `ext: 'ts'` or `'js'` — that combination
 * inherently requires writing a sibling `.bin`; use `output()` instead.
 */
export function serializeOutput(data: unknown, options?: OutputOptions): string {
  const ext = options?.ext ?? getExtFromPath(options?.path) ?? 'ts';
  if (options?.binary && ext !== 'json') {
    throw new Error(
      `serialize() cannot use binary mode with ext '${ext}' — it requires writing a sibling .bin file. Use output() with the same options instead.`,
    );
  }
  return buildContent(data, { ...options, ext });
}

/**
 * Serialize data to a binary Buffer using Node.js's structured clone algorithm
 * (`v8.serialize`). Preserves Date, Map, Set, RegExp, BigInt, TypedArray,
 * `undefined`, and circular references with no information loss.
 *
 * The resulting Buffer is only readable in a Node.js environment via
 * `deserializeBinary` (or `v8.deserialize` directly).
 */
export function serializeBinary(data: unknown): Buffer {
  return v8Serialize(data);
}

/**
 * Deserialize a binary Buffer produced by `serializeBinary` (or `v8.serialize`)
 * back into the original JavaScript value.
 *
 * Accepts either a Buffer or a path to a `.bin` file written by `outputToFile`.
 *
 * Pass a generic type parameter to cast the result, e.g.
 * `deserializeBinary<User>('./user.bin')`.
 */
export function deserializeBinary<T = unknown>(
  input: Buffer | Uint8Array | string,
): T {
  const buffer = typeof input === 'string' ? readFileSync(input) : input;
  return v8Deserialize(buffer) as T;
}

export function outputToFile(data: unknown, options?: OutputOptions) {
  const ext = options?.ext ?? getExtFromPath(options?.path) ?? 'ts';
  const outputPath =
    options?.path ?? `${DEFAULT_OUTPUT_DIR}/${DEFAULT_OUTPUT_FILENAME}.${ext}`;

  if (options?.portable && ext !== 'json') {
    throw new Error(
      `output(): portable output requires async byte access. Use ` +
        `outputAsync(data, { portable: true }) instead.`,
    );
  }

  const dir = dirname(outputPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  if (options?.binary && (ext === 'ts' || ext === 'js')) {
    const binName = wrapperBinRelativeName(outputPath);
    const binPath = join(dir, binName);
    writeFileSync(binPath, serializeBinary(data));
    const wrapper = buildBinWrapper(outputPath, options, ext);
    writeFileSync(outputPath, wrapper, 'utf-8');
    return outputPath;
  }

  const content = buildContent(data, { ...options, ext });
  writeFileSync(outputPath, content, 'utf-8');
  return outputPath;
}

/**
 * Async counterpart of `outputToFile`. Required for `portable: true`, which
 * reads File/Blob/FormData bytes asynchronously and writes a self-contained,
 * cross-runtime ESM module (`export const <name> = <expr>`). Non-portable
 * modes (json / ts / js / binary) behave like `outputToFile` but write with
 * async fs.
 */
export async function outputToFileAsync(
  data: unknown,
  options?: OutputOptions,
): Promise<string> {
  const ext = options?.ext ?? getExtFromPath(options?.path) ?? 'ts';
  const outputPath =
    options?.path ?? `${DEFAULT_OUTPUT_DIR}/${DEFAULT_OUTPUT_FILENAME}.${ext}`;

  const dir = dirname(outputPath);
  await mkdir(dir, { recursive: true });

  if (options?.portable && (ext === 'ts' || ext === 'js')) {
    const expr = await serializePortableSourceAsync(data);
    const content = buildPortableContent(expr, options ?? {});
    await writeFile(outputPath, content, 'utf-8');
    return outputPath;
  }

  if (options?.binary && (ext === 'ts' || ext === 'js')) {
    const binName = wrapperBinRelativeName(outputPath);
    const binPath = join(dir, binName);
    await writeFile(binPath, serializeBinary(data));
    const wrapper = buildBinWrapper(outputPath, options ?? {}, ext);
    await writeFile(outputPath, wrapper, 'utf-8');
    return outputPath;
  }

  const content = buildContent(data, { ...options, ext });
  await writeFile(outputPath, content, 'utf-8');
  return outputPath;
}
