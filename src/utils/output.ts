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
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { z } from 'zod';

const outputExtSchema = z.literal(['json', 'js', 'ts']);
type OutputExt = z.infer<typeof outputExtSchema>;

export type OutputOptions = {
  path?: string;
  ext?: OutputExt;
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

export function outputToFile(data: unknown, options?: OutputOptions) {
  const ext = options?.ext ?? getExtFromPath(options?.path) ?? 'ts';
  const outputPath =
    options?.path ?? `${DEFAULT_OUTPUT_DIR}/${DEFAULT_OUTPUT_FILENAME}.${ext}`;

  const dir = dirname(outputPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const content =
    ext === 'json'
      ? serializeToJSON(data)
      : `export const mockData = ${serializeToJS(data, 0)};\n`;

  writeFileSync(outputPath, content, 'utf-8');
  return outputPath;
}
