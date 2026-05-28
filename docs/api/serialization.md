# Serialization & Output

Methods that turn generated data into a string, a binary buffer, or a file —
and the matching deserializers. None are chainable.

## Choosing a method

| Method | Output | Runtime | Preserves | Lossless round-trip |
|--------|--------|---------|-----------|---------------------|
| `serialize` | `.ts` / `.js` / `.json` source string | any (string only) | Date, BigInt, Map, Set, Symbol, File, Blob in ts/js | ❌ (source text, JSON loses types) |
| `serializeBinary` | `Buffer` (`v8.serialize`) | **Node only** | Date, Map, Set, RegExp, BigInt, TypedArray, `undefined`, circular refs | ✅ |
| `serializePortable` | portable string (seroval) | **any** (Node ↔ browser) | the above **+** `NaN`/`Infinity`, shared refs, `Symbol`, URL/URLSearchParams/Headers | ✅ |
| `output` | file on disk | **Node only** | depends on extension (see below) | ✅ with `binary: true` |

Rule of thumb: **`serialize`** for human-readable fixtures, **`serializeBinary`**
for a lossless Node-only blob, **`serializePortable`** when the data must cross
runtimes (e.g. generated in Node, hydrated in the browser).

## serialize

```ts
serialize(data: unknown, options?: OutputOptions): string
```

Serializes mock data to a string without writing to a file. Returns the same content that `output` would write. Useful when you need to customize the output further before writing it yourself.

```ts
const data = generator.generate(schema)

// Get serialized string (default: TypeScript format)
const content = generator.serialize(data)
// => "export const mockData = {\n  \"id\": \"...\",\n  ...\n};\n"

// Custom export name and header/footer
const content = generator.serialize(data, {
  exportName: 'generatedMockData',
  header: "import type { User } from './types';",
  footer: 'export type MockData = typeof generatedMockData;',
})
```

## serializeBinary

```ts
serializeBinary(data: unknown): Buffer
```

Serializes data to a binary `Buffer` using Node.js's structured clone algorithm (`v8.serialize`). Preserves `Date`, `Map`, `Set`, `RegExp`, `BigInt`, `TypedArray`, `undefined`, and circular references with no information loss. The result is only readable in a Node.js environment via `deserialize` (or `v8.deserialize`).

```ts
const data = generator.generate(schema)
const buf = generator.serializeBinary(data) // Buffer
```

## deserialize

```ts
deserialize<T = unknown>(input: Buffer | Uint8Array | string): T
```

Restores a value previously serialized via `serializeBinary` or `output({ binary: true })`. Pass either a `Buffer`/`Uint8Array` or a path to a `.bin` file. Pass a generic type parameter to type the result.

```ts
// Type the result via a generic parameter
const restored = generator.deserialize<User>('./mocks/user.bin')

// From a Buffer
const restored = generator.deserialize<User>(generator.serializeBinary(data))
```

## serializePortable / serializePortableAsync

```ts
serializePortable(data: unknown, options?: PortableOptions): string
serializePortableAsync(data: unknown, options?: PortableOptions): Promise<string>
```

Serializes data to a **portable string** via [seroval](https://github.com/lxsmnsyc/seroval). Unlike `serializeBinary` (Node-only `v8`), the result round-trips across **any JS runtime** — Node↔browser and browser↔browser. Preserves `Date`, `RegExp`, `Map`, `Set`, `BigInt`, `TypedArray`, `undefined`, `NaN`/`Infinity`, circular/shared references, and (via bundled plugins) `URL`, `URLSearchParams`, `Headers`.

`File`, `Blob`, and `FormData` read their bytes asynchronously, so they only round-trip through `serializePortableAsync` — the sync form throws a clear error pointing to the async variant when it meets them.

`Symbol` is supported: registry symbols (`Symbol.for`) round-trip with identity intact, and described symbols (`Symbol('x')`, e.g. from `z.symbol()`) round-trip by description — with identity preserved among references **within the same payload**. Two limits are inherent: an anonymous symbol's cross-runtime `===` identity cannot be recovered (it is unique by definition), and symbols used as object property **keys** are not preserved (only as values, Map keys, and Set members). One implementation caveat: symbols are encoded under an internal marker key, so a hand-crafted plain object whose **only** key is that marker (`$$zod-v4-mocks/symbol$$`) deserializes back as a `Symbol` — generated mocks never produce such a key, so this only affects look-alike data built by hand.

```ts
const data = generator.generate(schema)

// Cross-runtime string
const str = generator.serializePortable(data)

// Base64 for embedding in JSON fields / env vars / headers
const b64 = generator.serializePortable(data, { base64: true })

// Async — required when data contains File / Blob / FormData
const asyncStr = await generator.serializePortableAsync(data)
```

## deserializePortable

```ts
deserializePortable<T = unknown>(input: string, options?: PortableOptions): T
```

Restores a value produced by `serializePortable` / `serializePortableAsync`, in any JS runtime. Pass `{ base64: true }` if it was encoded that way, and a generic type parameter to type the result.

```ts
const restored = generator.deserializePortable<User>(str)
const restoredFromB64 = generator.deserializePortable<User>(b64, { base64: true })
```

::: warning Evaluated on restore
`deserializePortable` evaluates the serialized string, so only restore data you produced yourself — never untrusted input.
:::

### PortableOptions

```ts
type PortableOptions = {
  base64?: boolean // base64-encode the string (text-safe); pass the same flag to deserializePortable
}
```

## output

```ts
output(data: unknown, options?: OutputOptions): string
```

Outputs mock data to a file. Only works in Node.js environments. Returns the output path as a string.

```ts
const data = generator.generate(schema)

// Output as TypeScript file (default)
generator.output(data)
// => "./__generated__/generated-mock-data.ts"

// Specify path and extension
generator.output(data, { path: './mocks/user.json' })
generator.output(data, { path: './mocks/user.ts' })
generator.output(data, { path: './mocks/user.js' })

// `binary: true` — for ts/js output, writes a thin ESM wrapper plus a sibling
// <name>.bin produced by v8.serialize. The wrapper lazily deserializes the
// .bin on import, so the module behaves like normal `import { mockData }`
// but preserves Date / Map / Set / RegExp / BigInt / TypedArray / undefined /
// circular refs losslessly. The exported value is typed as `unknown`; cast on
// the consumer side or use `deserialize<T>()` directly when you need typing.
generator.output(data, { path: './mocks/user.ts', binary: true })
generator.output(data, { path: './mocks/user.js', binary: true })

// Custom export name with header/footer
generator.output(data, {
  path: './mocks/user.ts',
  exportName: 'generatedMockData',
  header: "import type { User } from './types';",
  footer: 'export type MockData = typeof generatedMockData;',
})
```

### OutputOptions

```ts
type OutputOptions = {
  path?: string                    // output path (default: ./__generated__/generated-mock-data.<ext>)
  ext?: 'json' | 'js' | 'ts'       // extension (inferred from path, defaults to 'ts')
  exportName?: string              // custom export variable name (default: 'mockData', ts/js only)
  header?: string                  // string prepended to the output content (ignored for json)
  footer?: string                  // string appended to the output content (ignored for json)
  binary?: boolean                 // for ts/js, write a <name>.bin and a wrapper that deserializes it; ignored for json
  portable?: boolean               // outputAsync only: inline cross-runtime expr (ts/js); File/Blob/FormData + circular; no Symbol; ignored for json
}
```

### Output Formats

| Extension | Format | Special Type Handling |
|--------|------|-------------|
| `.ts` / `.js` | `export const <exportName> = ...` | Accurately serializes Date, BigInt, Map, Set, Symbol, File, Blob |
| `.ts` / `.js` + `binary: true` | ESM wrapper + sibling `.bin` (v8 structured clone) | Preserves Date, Map, Set, RegExp, BigInt, TypedArray, `undefined`, circular refs. The wrapper exports the value as `unknown`; cast on the consumer side or use `deserialize<T>()` for typing. Node.js only. |
| `.ts` / `.js` + `portable: true` (**`outputAsync`**) | inline `export const <name> = <seroval expr>` | Cross-runtime (Node↔browser), no sibling file and no consumer dependency. Preserves File/Blob/FormData **contents**, Date, Map, Set, BigInt, TypedArray, circular/shared refs. **No `Symbol`.** |
| `.json` | JSON | Date as ISO string, BigInt as string, Map/Set/Symbol lose information (with warnings). `binary` is ignored. |

::: warning Data Loss in JSON Output
When outputting data containing types that cannot be represented in JSON (BigInt, Symbol, Map, Set, File, Blob) as `.json`, data accuracy is lost. Warning messages will be displayed, so consider using `.ts` / `.js` (optionally with `binary: true`) instead.
:::

::: info `binary: true` (lossless round-trip)
With `binary: true`, `output()` writes two files:

- `<name>.bin` — raw `v8.serialize` Buffer. Perfectly preserves every value Zod can generate, including circular references.
- `<name>.ts` / `<name>.js` — a thin ESM wrapper that lazily `v8.deserialize`s the sibling `.bin` at import time, so consumers just do `import { mockData } from './user'` with no awareness of the binary representation.

The wrapper exports the value as `unknown`; cast on the consumer side, or call `deserialize<T>('./user.bin')` directly when you want a typed value without going through the wrapper. The `.bin` filename is always derived from the wrapper's basename and cannot be customized separately. The wrapper targets ESM (`import.meta.dirname`) and requires Node.js 20.11+.
:::

## outputAsync

```ts
outputAsync(data: unknown, options?: OutputOptions): Promise<string>
```

Async counterpart of `output`. Required for `{ portable: true }`, which reads `File`/`Blob`/`FormData` bytes asynchronously. Non-portable modes (`json` / `ts` / `js` / `binary`) behave like `output` but write with async fs. Returns the output path.

With `portable: true` (ts/js) it inlines a self-contained, cross-runtime expression — `export const <name> = <seroval expr>` — that reconstructs on a plain `import` in **any JS runtime** (Node↔browser). Unlike `binary: true` (Node-only v8 + sibling `.bin`), there is **no sibling file and no runtime dependency for consumers**, and `File`/`Blob`/`FormData` round-trip **with their contents**, alongside Date, Map, Set, BigInt, TypedArray, and circular/shared references.

```ts
const data = generator.generate(schema)

// Cross-runtime, lossless fixture — including File/Blob contents
const path = await generator.outputAsync(data, {
  path: './mocks/user.ts',
  portable: true,
})
// consume anywhere: import { mockData } from './mocks/user'
```

::: warning Symbol is not supported in portable output
An inline `import` has no unbox step, so `portable: true` **rejects `Symbol` values** (they would deserialize as plain objects). Use `ext: 'ts'`/`'js'` without `portable` (it emits `Symbol(...)` literals), or the `serializePortable` / `deserializePortable` string pair. Passing `portable` to the synchronous `output()` throws — use `outputAsync`.
:::
