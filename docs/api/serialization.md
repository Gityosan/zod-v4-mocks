# Serialization & Output

Methods that turn generated data into a string, a binary buffer, or a file —
and the matching deserializers. None are chainable.

## Choosing a method

| Method | Output | Runtime | Preserves | Lossless round-trip |
|--------|--------|---------|-----------|---------------------|
| `serialize` | `.ts` / `.js` / `.json` source string | any (string only) | Date, BigInt, Map, Set, Symbol, File, Blob in ts/js | ❌ (source text, JSON loses types) |
| `serializeBinary` | `Buffer` (`v8.serialize`) | **Node only** | Date, Map, Set, RegExp, BigInt, TypedArray, `undefined`, circular refs | ✅ |
| `serializeGreft` | `Uint8Array` (`greft-codec`) | **any** (Node ↔ browser ↔ other languages) | the above **+** Symbol, `NaN`/`Infinity`, shared refs | ✅ |
| `serializePortable` | portable string (seroval) | **any** (Node ↔ browser) | the above **+** URL/URLSearchParams/Headers | ✅ |
| `output` | file on disk | **Node only** | depends on extension (see below) | ✅ with `binary` |

Rule of thumb: **`serialize`** for human-readable fixtures, **`serializeBinary`**
for a lossless Node-only blob (zero extra deps), **`serializeGreft`** for a
compact lossless blob that decodes in any JS runtime — or even in Python / Rust /
Go via a [greft-codec](https://github.com/Gityosan/greft) port,
**`serializePortable`** when you need a plain-text (non-binary) payload that
crosses JS runtimes (e.g. embedded in JSON or an env var).

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

Serializes data to a binary `Buffer` using Node.js's structured clone algorithm (`v8.serialize`). Preserves `Date`, `Map`, `Set`, `RegExp`, `BigInt`, `TypedArray`, `undefined`, and circular references with no information loss. The result is only readable in a Node.js environment via `deserialize` (or `v8.deserialize`). For a cross-runtime / cross-language binary, use [`serializeGreft`](#serializegreft) instead.

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

## serializeGreft

```ts
serializeGreft(data: unknown): Uint8Array
serializeGreft(data: unknown, options: { base64: true }): string
```

Serializes data to a binary `Uint8Array` using [greft-codec](https://github.com/Gityosan/greft)'s language-agnostic lossless format. Preserves `Date`, `Map`, `Set`, `RegExp`, `BigInt`, `TypedArray`, `Symbol`, `undefined`, `NaN`/`Infinity`, and circular/shared references with no information loss. Unlike `serializeBinary` (Node-only `v8.serialize`), the bytes round-trip across **any JS runtime** and can also be decoded in other languages (Python / Rust / Go / …) via a greft-codec port — ideal for reusing mock data as a cross-language test fixture.

Pass `{ base64: true }` to get a text-safe **string** instead of raw bytes. The string is pure data — no `node:fs` dependency — so you can embed it directly in JSON, an env var, or any transport that rejects binary, while it stays cross-language (any greft port can base64-decode then `decode`).

```ts
const data = generator.generate(schema)
const bytes = generator.serializeGreft(data) // Uint8Array

// Cross-language + node-free: embed the base64 string anywhere (e.g. JSON)
const fixture = JSON.stringify({ $greft: generator.serializeGreft(data, { base64: true }) })
```

## deserializeGreft

```ts
deserializeGreft<T = unknown>(input: Uint8Array | string): T
deserializeGreft<T = unknown>(input: string, options: { base64: true }): T
```

Restores a value previously serialized via `serializeGreft` or `output({ binary: 'greft' })`. Pass either a `Uint8Array`/`Buffer` or a path to a `.bin` file. Pass `{ base64: true }` to decode a base64 string from `serializeGreft(data, { base64: true })` — the string is then treated as data, not a file path. Pass a generic type parameter to type the result.

```ts
// Type the result via a generic parameter
const restored = generator.deserializeGreft<User>('./mocks/user.bin')

// From bytes
const restored = generator.deserializeGreft<User>(generator.serializeGreft(data))

// From a base64 string pulled out of JSON (works in any JS runtime)
const { $greft } = JSON.parse(fixture)
const restored = generator.deserializeGreft<User>($greft, { base64: true })
```

## serializePortable / serializePortableAsync

[▶ Try it in the Playground](/playground/?example=portable)

```ts
serializePortable(data: unknown, options?: PortableOptions): string
serializePortableAsync(data: unknown, options?: PortableOptions): Promise<string>
```

Serializes data to a **portable string** via [seroval](https://github.com/lxsmnsyc/seroval). Like `serializeGreft` the result round-trips across **any JS runtime**, but it is plain text rather than binary — handy when the payload must live inside JSON, an env var, or an HTTP header. Preserves `Date`, `RegExp`, `Map`, `Set`, `BigInt`, `TypedArray`, `undefined`, `NaN`/`Infinity`, circular/shared references, and (via bundled plugins) `URL`, `URLSearchParams`, `Headers`. (For a cross-**language** payload, prefer `serializeGreft`.)

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

// `binary: true` (= `'v8'`) — for ts/js output, writes a thin ESM wrapper plus
// a sibling <name>.bin produced by v8.serialize. The wrapper lazily deserializes
// the .bin on import, so the module behaves like normal `import { mockData }`
// but preserves Date / Map / Set / RegExp / BigInt / TypedArray / undefined /
// circular refs losslessly. The exported value is typed as `unknown`; cast on
// the consumer side or use `deserialize<T>()` for typing. (Node-only.)
generator.output(data, { path: './mocks/user.ts', binary: true })
generator.output(data, { path: './mocks/user.js', binary: true })

// `binary: 'greft'` — same wrapper + sibling .bin, but encoded with greft-codec.
// The .bin is a cross-language artifact (decodable in any JS runtime, or in
// Python / Rust / Go via a greft-codec port) and additionally preserves Symbol
// and NaN/Infinity. The wrapper imports `decode` from `zod-v4-mocks/greft`, so
// consumers only need zod-v4-mocks installed — not greft-codec directly.
generator.output(data, { path: './mocks/user.ts', binary: 'greft' })

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
  binary?: boolean | 'v8' | 'greft' // for ts/js, write a <name>.bin + a wrapper that reconstructs it. true/'v8' = v8.serialize (Node-only); 'greft' = greft-codec (cross-language). ignored for json
  portable?: boolean               // outputAsync only: inline cross-runtime expr (ts/js); File/Blob/FormData + circular; no Symbol; ignored for json
}
```

### Output Formats

| Extension | Format | Special Type Handling |
|--------|------|-------------|
| `.ts` / `.js` | `export const <exportName> = ...` | Accurately serializes Date, BigInt, Map, Set, Symbol, File, Blob |
| `.ts` / `.js` + `binary: true` / `'v8'` | ESM wrapper + sibling `.bin` (v8 structured clone) | Preserves Date, Map, Set, RegExp, BigInt, TypedArray, `undefined`, circular refs. The wrapper exports the value as `unknown`; cast on the consumer side or use `deserialize<T>()` for typing. Node.js only, no extra runtime dependency. |
| `.ts` / `.js` + `binary: 'greft'` | ESM wrapper + sibling `.bin` (greft-codec) | Same as above **+** Symbol, `NaN`/`Infinity`, shared refs. The `.bin` is cross-language (decodable in any JS runtime, or in Python / Rust / Go via a greft-codec port). The wrapper imports `decode` from `zod-v4-mocks/greft`, so consumers only need `zod-v4-mocks` installed (not greft-codec directly). |
| `.ts` / `.js` + `portable: true` (**`outputAsync`**) | inline `export const <name> = <seroval expr>` | Cross-runtime (Node↔browser), no sibling file and no consumer dependency. Preserves File/Blob/FormData **contents**, Date, Map, Set, BigInt, TypedArray, circular/shared refs. **No `Symbol`.** |
| `.json` | JSON | Date as ISO string, BigInt as string, Map/Set/Symbol lose information (with warnings). `binary` is ignored. |

::: warning Data Loss in JSON Output
When outputting data containing types that cannot be represented in JSON (BigInt, Symbol, Map, Set, File, Blob) as `.json`, data accuracy is lost. Warning messages will be displayed, so consider using `.ts` / `.js` (optionally with `binary: true`) instead.
:::

::: info `binary` (lossless round-trip)
With `binary: true` (`'v8'`) or `binary: 'greft'`, `output()` writes two files:

- `<name>.bin` — the binary payload. `true`/`'v8'` uses Node's `v8.serialize` (Node-only); `'greft'` uses a [greft-codec](https://github.com/Gityosan/greft) byte stream that is decodable in any JS runtime (or in Python / Rust / Go via a port). Both perfectly preserve every value Zod can generate, including circular references; `'greft'` additionally preserves `Symbol` and `NaN`/`Infinity`.
- `<name>.ts` / `<name>.js` — a thin ESM wrapper that lazily reconstructs the sibling `.bin` at import time (`v8.deserialize` for `'v8'`, `decode` from `zod-v4-mocks/greft` for `'greft'`), so consumers just do `import { mockData } from './user'` with no awareness of the binary representation.

With `'greft'`, the wrapper imports `decode` from `zod-v4-mocks/greft` (a re-export of greft-codec), so consumers only need `zod-v4-mocks` installed — the same package they generated the file with — and never the transitive greft-codec dependency directly. The wrapper exports the value as `unknown`; cast on the consumer side, or call `deserialize<T>('./user.bin')` / `deserializeGreft<T>('./user.bin')` directly when you want a typed value without going through the wrapper. The `.bin` filename is always derived from the wrapper's basename and cannot be customized separately. The wrapper targets ESM (`import.meta.dirname`) and requires Node.js 20.11+.
:::

## outputAsync

```ts
outputAsync(data: unknown, options?: OutputOptions): Promise<string>
```

Async counterpart of `output`. Required for `{ portable: true }`, which reads `File`/`Blob`/`FormData` bytes asynchronously. Non-portable modes (`json` / `ts` / `js` / `binary`) behave like `output` but write with async fs. Returns the output path.

With `portable: true` (ts/js) it inlines a self-contained, cross-runtime expression — `export const <name> = <seroval expr>` — that reconstructs on a plain `import` in **any JS runtime** (Node↔browser). Unlike `binary` (which writes a sibling `.bin`), there is **no sibling file**, and `File`/`Blob`/`FormData` round-trip **with their contents**, alongside Date, Map, Set, BigInt, TypedArray, and circular/shared references.

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
