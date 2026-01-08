import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { z } from 'zod';

const outputExtSchema = z.enum(['json', 'js', 'ts']);
type OutputExt = z.infer<typeof outputExtSchema>;

export type OutputOptions = {
  path?: string;
  ext?: OutputExt;
};

const DEFAULT_OUTPUT_DIR = './__generated__';
const DEFAULT_OUTPUT_FILENAME = 'generated-mock-data';

function serializeToJS(value: unknown, indent = 0): string {
  const spaces = '  '.repeat(indent);
  const nextSpaces = '  '.repeat(indent + 1);

  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value === 'bigint') return `${value}n`;
  if (value instanceof Date) {
    return `new Date("${value.toISOString()}")`;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const items = value.map(
      (v) => `${nextSpaces}${serializeToJS(v, indent + 1)}`,
    );
    return `[\n${items.join(',\n')}\n${spaces}]`;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 0) return '{}';
    const props = entries.map(
      ([k, v]) =>
        `${nextSpaces}${JSON.stringify(k)}: ${serializeToJS(v, indent + 1)}`,
    );
    return `{\n${props.join(',\n')}\n${spaces}}`;
  }
  return String(value);
}

function getExtFromPath(path?: string): OutputExt | undefined {
  if (!path) return undefined;
  const match = /\.(json|js|ts)$/.exec(path);
  if (!match) return undefined;
  const result = outputExtSchema.safeParse(match[1]);
  return result.success ? result.data : undefined;
}

export function outputToFile(data: unknown, options?: OutputOptions): string {
  const ext = options?.ext ?? getExtFromPath(options?.path) ?? 'ts';
  const outputPath =
    options?.path ?? `${DEFAULT_OUTPUT_DIR}/${DEFAULT_OUTPUT_FILENAME}.${ext}`;

  const dir = dirname(outputPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  let content: string;
  if (ext === 'json') {
    const bigIntFields: { key: string; value: string }[] = [];
    content = JSON.stringify(
      data,
      (key, v) => {
        if (typeof v === 'bigint') {
          const strValue = v.toString();
          bigIntFields.push({ key, value: strValue });
          return strValue;
        }
        return v;
      },
      2,
    );
    if (bigIntFields.length > 0) {
      const details = bigIntFields
        .map(({ key, value }) => `  - ${key}: ${value}`)
        .join('\n');
      console.warn(
        `Warning: BigInt values were converted to strings in JSON output. Consider using .ts or .js format instead.\n${details}`,
      );
    }
  } else {
    content = `export const mockData = ${serializeToJS(data, 0)};\n`;
  }

  writeFileSync(outputPath, content, 'utf-8');
  return outputPath;
}
