import { z } from 'zod';
import { safeInstanceof } from './schema';

const INDENT = '  ';

function literalToTs(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return 'number';
    if (value === Infinity || value === -Infinity) return 'number';
    return String(value);
  }
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'bigint') return `${value}n`;
  return 'unknown';
}

function unique(types: string[]): string[] {
  return Array.from(new Set(types));
}

function unionOf(types: string[]): string {
  const deduped = unique(types);
  if (deduped.length === 0) return 'never';
  if (deduped.length === 1) return deduped[0];
  return deduped.join(' | ');
}

function isOptionalField(schema: z.core.$ZodType): boolean {
  return (
    safeInstanceof(schema, z.ZodOptional) ||
    safeInstanceof(schema, z.ZodExactOptional) ||
    safeInstanceof(schema, z.ZodDefault) ||
    safeInstanceof(schema, z.ZodPrefault)
  );
}

/**
 * Convert a Zod schema to a TypeScript type string.
 * Returns `'unknown'` for types that cannot be represented statically
 * (e.g. unhandled schemas, circular references).
 */
export function zodToTsType(schema: z.core.$ZodType): string {
  const visited = new WeakSet<z.core.$ZodType>();

  function render(s: z.core.$ZodType, depth: number): string {
    if (visited.has(s)) return 'unknown';

    // Wrappers — unwrap first
    if (safeInstanceof(s, z.ZodReadonly)) {
      return `Readonly<${render(s.unwrap(), depth)}>`;
    }
    if (safeInstanceof(s, z.ZodOptional) || safeInstanceof(s, z.ZodExactOptional)) {
      return unionOf([render(s.unwrap(), depth), 'undefined']);
    }
    if (safeInstanceof(s, z.ZodNullable)) {
      return unionOf([render(s.unwrap(), depth), 'null']);
    }
    if (safeInstanceof(s, z.ZodNonOptional)) {
      return render(s.unwrap(), depth).replace(/\s*\|\s*undefined/g, '');
    }
    if (safeInstanceof(s, z.ZodDefault) || safeInstanceof(s, z.ZodPrefault)) {
      return render(s.unwrap(), depth);
    }
    if (safeInstanceof(s, z.ZodLazy)) {
      visited.add(s);
      try {
        return render(s.unwrap(), depth);
      } finally {
        visited.delete(s);
      }
    }
    if (safeInstanceof(s, z.ZodPipe)) {
      return render(s.def.out, depth);
    }
    if (safeInstanceof(s, z.ZodCatch)) {
      return render(s.def.innerType, depth);
    }
    if (safeInstanceof(s, z.ZodSuccess)) {
      return 'boolean';
    }
    if (safeInstanceof(s, z.ZodCodec)) {
      return render(s.def.out, depth);
    }

    // Primitives
    if (safeInstanceof(s, z.ZodString)) return 'string';
    if (safeInstanceof(s, z.ZodNumber)) return 'number';
    if (safeInstanceof(s, z.ZodNaN)) return 'number';
    if (safeInstanceof(s, z.ZodBigInt)) return 'bigint';
    if (safeInstanceof(s, z.ZodBoolean)) return 'boolean';
    if (safeInstanceof(s, z.ZodNull)) return 'null';
    if (safeInstanceof(s, z.ZodUndefined)) return 'undefined';
    if (safeInstanceof(s, z.ZodVoid)) return 'void';
    if (safeInstanceof(s, z.ZodAny)) return 'any';
    if (safeInstanceof(s, z.ZodUnknown)) return 'unknown';
    if (safeInstanceof(s, z.ZodNever)) return 'never';
    if (safeInstanceof(s, z.ZodSymbol)) return 'symbol';

    // Date / ISO date-like — all resolve to Date at runtime
    if (safeInstanceof(s, z.ZodDate)) return 'Date';

    // String-shaped format schemas
    if (
      safeInstanceof(s, z.ZodEmail) ||
      safeInstanceof(s, z.ZodURL) ||
      safeInstanceof(s, z.ZodJWT) ||
      safeInstanceof(s, z.ZodEmoji) ||
      safeInstanceof(s, z.ZodGUID) ||
      safeInstanceof(s, z.ZodUUID) ||
      safeInstanceof(s, z.ZodNanoID) ||
      safeInstanceof(s, z.ZodULID) ||
      safeInstanceof(s, z.ZodCUID) ||
      safeInstanceof(s, z.ZodCUID2) ||
      safeInstanceof(s, z.ZodXID) ||
      safeInstanceof(s, z.ZodKSUID) ||
      safeInstanceof(s, z.ZodIPv4) ||
      safeInstanceof(s, z.ZodIPv6) ||
      safeInstanceof(s, z.ZodCIDRv4) ||
      safeInstanceof(s, z.ZodCIDRv6) ||
      safeInstanceof(s, z.ZodMAC) ||
      safeInstanceof(s, z.ZodBase64) ||
      safeInstanceof(s, z.ZodBase64URL) ||
      safeInstanceof(s, z.ZodE164) ||
      safeInstanceof(s, z.ZodISODateTime) ||
      safeInstanceof(s, z.ZodISODate) ||
      safeInstanceof(s, z.ZodISOTime) ||
      safeInstanceof(s, z.ZodISODuration) ||
      safeInstanceof(s, z.ZodCustomStringFormat) ||
      safeInstanceof(s, z.ZodTemplateLiteral)
    ) {
      return 'string';
    }

    // File / Blob
    if (safeInstanceof(s, z.ZodFile)) return 'File';

    // Literal / Enum
    if (safeInstanceof(s, z.ZodLiteral)) {
      const values = (s.def.values ?? []) as unknown[];
      return unionOf(values.map(literalToTs));
    }
    if (safeInstanceof(s, z.ZodEnum)) {
      const entries = Object.values(s.def.entries ?? {}) as unknown[];
      return unionOf(entries.map(literalToTs));
    }

    // Collections
    if (safeInstanceof(s, z.ZodArray)) {
      const element = render(s.element, depth);
      return element.includes(' ') ? `Array<${element}>` : `${element}[]`;
    }
    if (safeInstanceof(s, z.ZodTuple)) {
      const items = (s.def.items ?? []) as z.core.$ZodType[];
      const rest = s.def.rest as z.core.$ZodType | undefined;
      const parts = items.map((item) => render(item, depth));
      if (rest) parts.push(`...${render(rest, depth)}[]`);
      return `[${parts.join(', ')}]`;
    }
    if (safeInstanceof(s, z.ZodSet)) {
      return `Set<${render(s.def.valueType, depth)}>`;
    }
    if (safeInstanceof(s, z.ZodMap)) {
      const key = render(s.def.keyType, depth);
      const val = render(s.def.valueType, depth);
      return `Map<${key}, ${val}>`;
    }
    if (safeInstanceof(s, z.ZodRecord)) {
      const key = render(s.def.keyType as z.core.$ZodType, depth);
      const val = render(s.def.valueType, depth);
      return `Record<${key}, ${val}>`;
    }

    // Object
    if (safeInstanceof(s, z.ZodObject)) {
      const shape = (s.def.shape ?? {}) as Record<string, z.core.$ZodType>;
      const keys = Object.keys(shape);
      if (keys.length === 0) return '{}';
      const innerPad = INDENT.repeat(depth + 1);
      const outerPad = INDENT.repeat(depth);
      const fields = keys.map((key) => {
        const field = shape[key];
        const optional = isOptionalField(field);
        const type = render(field, depth + 1);
        const safeKey = /^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key);
        return `${innerPad}${safeKey}${optional ? '?' : ''}: ${type};`;
      });
      return `{\n${fields.join('\n')}\n${outerPad}}`;
    }

    // Union / DiscriminatedUnion / Xor
    if (
      safeInstanceof(s, z.ZodUnion) ||
      safeInstanceof(s, z.ZodDiscriminatedUnion) ||
      safeInstanceof(s, z.ZodXor)
    ) {
      const options = (s.def.options ?? []) as z.core.$ZodType[];
      return unionOf(options.map((opt) => render(opt, depth)));
    }

    // Intersection
    if (safeInstanceof(s, z.ZodIntersection)) {
      const left = render(s.def.left, depth);
      const right = render(s.def.right, depth);
      return `${left} & ${right}`;
    }

    return 'unknown';
  }

  return render(schema, 0);
}
