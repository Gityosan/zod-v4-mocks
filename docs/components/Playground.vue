<script setup lang="ts">
import { onMounted, ref, shallowRef } from 'vue';
import MonacoEditor from './MonacoEditor.vue';
import OutputPanel from './OutputPanel.vue';
import { usePlaygroundI18n } from '../composables/usePlaygroundI18n';

const { t } = usePlaygroundI18n();

const examples = [
  {
    id: 'basic-object',
    label: 'Basic Object',
    code: `import { z } from 'zod'
import { initGenerator } from 'zod-v4-mocks'

const schema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
  age: z.number().min(18).max(120),
  isActive: z.boolean(),
})

const generator = initGenerator({ seed: 1 })
const result = generator.generate(schema)
`,
  },
  {
    id: 'nested-object',
    label: 'Nested Object',
    code: `import { z } from 'zod'
import { initGenerator } from 'zod-v4-mocks'

const addressSchema = z.object({
  street: z.string(),
  city: z.string(),
  zipCode: z.string(),
})

const userSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
  address: addressSchema,
  tags: z.array(z.string()),
})

const generator = initGenerator({ seed: 42 })
const result = generator.generate(userSchema)
`,
  },
  {
    id: 'union-enum',
    label: 'Union & Enum',
    code: `import { z } from 'zod'
import { initGenerator } from 'zod-v4-mocks'

const statusEnum = z.enum(['active', 'inactive', 'pending'])

const schema = z.object({
  id: z.number().int(),
  status: statusEnum,
  value: z.union([z.string(), z.number()]),
  metadata: z.record(z.string(), z.unknown()),
})

const generator = initGenerator({ seed: 1 })
const result = generator.generate(schema)
`,
  },
  {
    id: 'array-tuple',
    label: 'Array & Tuple',
    code: `import { z } from 'zod'
import { initGenerator } from 'zod-v4-mocks'

const schema = z.object({
  items: z.array(z.object({
    name: z.string(),
    price: z.number().min(0).max(10000),
  })),
  coordinates: z.tuple([z.number(), z.number()]),
  tags: z.set(z.string()),
})

const generator = initGenerator({
  seed: 1,
  array: { min: 2, max: 4 },
  set: { min: 2, max: 3 },
})
const result = generator.generate(schema)
`,
  },
  {
    id: 'multi-generate',
    label: 'multiGenerate',
    code: `import { z } from 'zod'
import { initGenerator } from 'zod-v4-mocks'

const userSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.email(),
})

const postSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  body: z.string(),
  published: z.boolean(),
})

const generator = initGenerator({ seed: 1 })
const result = generator.multiGenerate({
  user: userSchema,
  post: postSchema,
})
`,
  },
  {
    id: 'preflight',
    label: 'Preflight',
    code: `import { z } from 'zod'
import { initGenerator } from 'zod-v4-mocks'

// Before generating, zod-v4-mocks runs a "preflight" schema walk that
// flags constructs it cannot faithfully mock. Here the .refine() is
// dropped and the number range is impossible — both surface as warnings
// below while generation still proceeds.
const schema = z.object({
  username: z.string().min(3).refine((s) => s.startsWith('@')),
  score: z.number().min(100).max(10),
  tags: z.array(z.string()),
})

const generator = initGenerator({ seed: 1 })
const result = generator.generate(schema)
`,
  },
  {
    id: 'supply',
    label: 'supplyRef & supplyPath',
    code: `import { z } from 'zod'
import { initGenerator } from 'zod-v4-mocks'

const roleSchema = z.enum(['admin', 'user', 'guest'])

const schema = z.object({
  id: z.uuid(),
  role: roleSchema,
  profile: z.object({
    name: z.string(),
    country: z.string(),
  }),
})

// supplyRef pins a value wherever this exact schema reference appears.
// supplyPath pins a value at a specific path in the generated structure.
const generator = initGenerator({ seed: 1 })
  .supplyRef(roleSchema, 'admin')
  .supplyPath(['profile', 'country'], 'JP')

const result = generator.generate(schema)
`,
  },
  {
    id: 'portable',
    label: 'Portable serialize',
    code: `import { z } from 'zod'
import { initGenerator } from 'zod-v4-mocks'

// Portable serialization round-trips across any JS runtime and preserves
// Date / Map / Set / BigInt — types JSON.stringify would lose.
const User = z.object({
  id: z.uuid(),
  createdAt: z.date(),
  tags: z.set(z.string()),
  scores: z.map(z.string(), z.number().int()),
})

const generator = initGenerator({ seed: 1 })
const mock = generator.generate(User)

const portable = generator.serializePortable(mock)
const restored = generator.deserializePortable(portable)

const result = { portable, restored }
`,
  },
  {
    id: 'factory',
    label: 'factory',
    code: `import { z } from 'zod'
import { initGenerator } from 'zod-v4-mocks'

const User = z.object({
  id: z.uuid(),
  name: z.string(),
  active: z.boolean(),
})

// factory() binds a schema: next() makes one mock, take(n) makes an array.
const generator = initGenerator({ seed: 1 })
const userFactory = generator.factory(User)

const result = {
  first: userFactory.next(),
  batch: userFactory.take(3),
}
`,
  },
];

type PreflightDiagnostic = {
  level: 'error' | 'warning';
  path: string;
  message: string;
};

const code = ref(examples[0].code);
const result = ref<string | null>(null);
const error = ref<string | null>(null);
const parseResult = ref<{ success: boolean; error?: string } | null>(null);
const preflightResult = ref<PreflightDiagnostic[] | null>(null);
const isRunning = ref(false);
const editorReady = ref(false);
const editorRef = shallowRef<InstanceType<typeof MonacoEditor> | null>(null);

// Pre-loaded browser bundles
let zodModule: Record<string, unknown> | null = null;
let mocksModule: Record<string, unknown> | null = null;

async function importFromBlobUrl(
  source: string,
): Promise<Record<string, unknown>> {
  const blob = new Blob([source], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);
  try {
    return await import(/* @vite-ignore */ url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function loadBundles() {
  if (zodModule && mocksModule) return;

  const base = import.meta.env.BASE_URL || '/zod-v4-mocks/';

  // Fetch both bundles as text, then import via Blob URL
  // This avoids Vite's restriction on importing from /public directly
  const [zodSource, mocksSource] = await Promise.all([
    fetch(`${base}browser-bundles/zod.esm.js`).then((r) => r.text()),
    fetch(`${base}browser-bundles/zod-v4-mocks.esm.js`).then((r) => r.text()),
  ]);

  // Load zod first via Blob URL
  zodModule = await importFromBlobUrl(zodSource);

  // The mocks bundle has `from "zod"` imports that need to resolve to our zod bundle.
  // Create a Blob URL for zod that persists, then rewrite mocks imports to point to it.
  const zodBlob = new Blob([zodSource], { type: 'application/javascript' });
  const zodBlobUrl = URL.createObjectURL(zodBlob);

  const rewritten = mocksSource.replace(
    /from\s*["']zod["']/g,
    `from "${zodBlobUrl}"`,
  );

  mocksModule = await importFromBlobUrl(rewritten);
}

// Query parameter that pre-selects an example, e.g. ?example=preflight.
// Each example has a stable `id` so doc pages can deep-link to a pattern.
const EXAMPLE_PARAM = 'example';

function applyExample(index: number, updateUrl: boolean) {
  code.value = examples[index].code;
  result.value = null;
  error.value = null;
  parseResult.value = null;
  preflightResult.value = null;
  if (updateUrl && typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    url.searchParams.set(EXAMPLE_PARAM, examples[index].id);
    window.history.replaceState(window.history.state, '', url);
  }
}

function selectExample(index: number) {
  applyExample(index, true);
}

// On load, honor ?example=<id> (also accepts ?pattern=<id>) from the URL.
onMounted(() => {
  const params = new URLSearchParams(window.location.search);
  const id = params.get(EXAMPLE_PARAM) ?? params.get('pattern');
  if (!id) return;
  const index = examples.findIndex((ex) => ex.id === id);
  if (index >= 0) applyExample(index, false);
});

// Parse import statements and extract imported names
function parseImports(jsCode: string): {
  cleanedCode: string;
  importedFromZod: string[];
  importedFromMocks: string[];
} {
  const importedFromZod: string[] = [];
  const importedFromMocks: string[] = [];

  const cleanedCode = jsCode.replace(
    /import\s*\{([^}]+)\}\s*from\s*["']([^"']+)["']\s*;?/g,
    (_, names: string, source: string) => {
      const parsed = names.split(',').map((n: string) => {
        const parts = n.trim().split(/\s+as\s+/);
        return {
          original: parts[0].trim(),
          alias: (parts[1] || parts[0]).trim(),
        };
      });

      if (source === 'zod') {
        for (const p of parsed) importedFromZod.push(p.alias);
      } else if (source === 'zod-v4-mocks') {
        for (const p of parsed) importedFromMocks.push(p.alias);
      }

      // Remove import statement
      return '';
    },
  );

  return { cleanedCode, importedFromZod, importedFromMocks };
}

// Find the last variable assignment and return it along with schema for parse validation
function wrapWithReturn(code: string): string {
  const lines = code.trim().split('\n');

  // Collect all variable names for schema detection
  const varNames: string[] = [];
  for (const line of lines) {
    const m = line.match(/^\s*(?:const|let|var)\s+(\w+)\s*=/);
    if (m) varNames.push(m[1]);
  }

  // Find the last variable assignment (the result)
  let resultVar: string | null = null;
  let resultLine: string | null = null;
  for (let i = lines.length - 1; i >= 0; i--) {
    const match = lines[i].match(/^\s*(?:const|let|var)\s+(\w+)\s*=/);
    if (match) {
      resultVar = match[1];
      resultLine = lines[i];
      break;
    }
  }

  if (!resultVar) return code;

  // Detect the generator + schema only from a direct single-schema
  // `<gen>.generate(<schema>)` / `<gen>.generateMany(<schema>, n)` call on the
  // result line. We deliberately do NOT guess a schema by name: when the
  // result is a composite (e.g. a serialize round-trip or a factory batch),
  // validating the whole object against one schema would falsely report a
  // parse failure.
  let schemaVar: string | null = null;
  let generatorVar: string | null = null;
  if (resultLine) {
    const genMatch = resultLine.match(
      /(\w+)\s*\.\s*(?:generate|generateMany)\(\s*(\w+)/,
    );
    if (genMatch) {
      if (varNames.includes(genMatch[1])) generatorVar = genMatch[1];
      if (varNames.includes(genMatch[2])) schemaVar = genMatch[2];
    }
  }

  // Fallback: find the generator instance created via initGenerator().
  if (!generatorVar) {
    for (const line of lines) {
      const m = line.match(
        /^\s*(?:const|let|var)\s+(\w+)\s*=\s*initGenerator\b/,
      );
      if (m) {
        generatorVar = m[1];
        break;
      }
    }
  }

  const fields = [`__result: ${resultVar}`];
  if (schemaVar) fields.push(`__schema: ${schemaVar}`);
  // Surface preflight diagnostics for the generated schema. Guarded so older
  // bundles without the preflight() method degrade gracefully.
  if (schemaVar && generatorVar) {
    fields.push(
      `__preflight: (typeof ${generatorVar}?.preflight === 'function' ` +
        `? ${generatorVar}.preflight(${schemaVar}) : undefined)`,
    );
  }
  lines.push(`return { ${fields.join(', ')} };`);

  return lines.join('\n');
}

// Parse the error thrown by generate() when preflight finds error-level
// issues so they can be shown in the preflight panel instead of as a raw
// error string. Returns null for any other error.
function parsePreflightError(message: string): PreflightDiagnostic[] | null {
  if (!message.startsWith('Preflight check found')) return null;
  const diagnostics: PreflightDiagnostic[] = [];
  for (const line of message.split('\n')) {
    const m = line.match(/^\s*-\s*(.+?):\s+(.+)$/);
    if (m) {
      diagnostics.push({ level: 'error', path: m[1], message: m[2] });
    }
  }
  return diagnostics.length > 0 ? diagnostics : null;
}

// Custom JSON serializer that handles special types
function serializeResult(value: unknown): string {
  return JSON.stringify(
    value,
    (_key, v) => {
      if (typeof v === 'bigint') return `BigInt(${v.toString()})`;
      if (v instanceof Map) return Object.fromEntries(v);
      if (v instanceof Set) return Array.from(v);
      if (v instanceof Date) return v.toISOString();
      if (v instanceof RegExp) return v.toString();
      if (typeof v === 'symbol') return v.toString();
      if (v instanceof File) return `File("${v.name}")`;
      if (v instanceof Blob) return `Blob(${v.size} bytes)`;
      return v;
    },
    2,
  );
}

async function format() {
  if (!editorRef.value) return;
  await editorRef.value.formatCode();
}

async function run() {
  if (!editorRef.value) return;

  isRunning.value = true;
  error.value = null;
  result.value = null;
  parseResult.value = null;
  preflightResult.value = null;

  try {
    // 1. Load browser bundles
    await loadBundles();

    // 2. Transpile TypeScript to JavaScript via Monaco TS Worker
    const jsCode = await editorRef.value.getTranspiledCode();

    // 3. Parse and remove import statements
    const { cleanedCode, importedFromZod, importedFromMocks } =
      parseImports(jsCode);

    // 4. Wrap with return for the last variable
    const executableCode = wrapWithReturn(cleanedCode);

    // 5. Build argument names and values
    const argNames: string[] = [];
    const argValues: unknown[] = [];

    for (const name of importedFromZod) {
      argNames.push(name);
      argValues.push((zodModule as Record<string, unknown>)[name]);
    }
    for (const name of importedFromMocks) {
      argNames.push(name);
      argValues.push((mocksModule as Record<string, unknown>)[name]);
    }

    // 6. Execute with timeout
    const AsyncFunction = Object.getPrototypeOf(
      async function () {},
    ).constructor;
    const fn = new AsyncFunction(...argNames, executableCode);

    const timeoutMs = 5000;
    const resultValue = await Promise.race([
      fn(...argValues),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(t.value.timeout)),
          timeoutMs,
        ),
      ),
    ]);

    // 7. Extract result, schema, and preflight diagnostics, then serialize
    const wrapped = resultValue as
      | {
          __result: unknown;
          __schema?: { safeParse: (v: unknown) => { success: boolean; error?: { message: string } } };
          __preflight?: PreflightDiagnostic[];
        }
      | undefined;

    const actualResult = wrapped?.__result ?? resultValue;
    const schemaObj = wrapped?.__schema;

    if (Array.isArray(wrapped?.__preflight)) {
      preflightResult.value = wrapped.__preflight;
    }

    if (actualResult !== undefined) {
      result.value = serializeResult(actualResult);
    } else {
      result.value = 'undefined';
    }

    // 8. Run schema.parse() validation if schema is available
    if (schemaObj && typeof schemaObj.safeParse === 'function') {
      try {
        const parsed = schemaObj.safeParse(actualResult);
        if (parsed.success) {
          parseResult.value = { success: true };
        } else {
          const errMsg =
            parsed.error && 'message' in parsed.error
              ? parsed.error.message
              : JSON.stringify(parsed.error, null, 2);
          parseResult.value = { success: false, error: String(errMsg) };
        }
      } catch (parseErr) {
        parseResult.value = {
          success: false,
          error: parseErr instanceof Error ? parseErr.message : String(parseErr),
        };
      }
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    // A preflight error-level failure is reported in the preflight panel
    // rather than as a generic error.
    const preflightErrors = parsePreflightError(message);
    if (preflightErrors) {
      preflightResult.value = preflightErrors;
    } else {
      error.value = message;
    }
  } finally {
    isRunning.value = false;
  }
}
</script>

<template>
  <div class="playground">
    <div class="playground-header">
      <h1>Playground</h1>
      <p>{{ t.description }}</p>
    </div>
    <div class="playground-toolbar">
      <div class="playground-examples">
        <span class="toolbar-label">{{ t.examples }}</span>
        <button
          v-for="(ex, i) in examples"
          :key="ex.label"
          class="example-btn"
          :class="{ active: code === ex.code }"
          @click="selectExample(i)"
        >
          {{ ex.label }}
        </button>
      </div>
      <div class="toolbar-actions">
        <button
          class="format-btn"
          :disabled="!editorReady"
          @click="format"
        >
          Format
        </button>
        <button
          class="run-btn"
          :disabled="isRunning || !editorReady"
          @click="run"
        >
          {{ isRunning ? t.running : '▶ Generate Mock' }}
        </button>
      </div>
    </div>
    <div class="playground-panels">
      <div class="panel editor-panel">
        <div class="panel-header">Input</div>
        <ClientOnly>
          <MonacoEditor
            ref="editorRef"
            v-model="code"
            @ready="editorReady = true"
          />
        </ClientOnly>
      </div>
      <div class="panel output-panel-wrapper">
        <div class="panel-header">Output</div>
        <OutputPanel
          :result="result"
          :error="error"
          :is-running="isRunning"
          :parse-result="parseResult"
          :preflight-result="preflightResult"
          :running-text="t.running"
          :placeholder-text="t.placeholder"
          :preflight-text="t.preflight"
          :no-issues-text="t.noIssues"
          :warning-text="t.warning"
          :error-text="t.error"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.playground {
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px 32px 64px;
}

.playground-header h1 {
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.2;
  color: var(--vp-c-text-1);
  margin: 0 0 8px;
}

.playground-header p {
  font-size: 15px;
  color: var(--vp-c-text-2);
  margin: 0 0 24px;
}

.playground-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.playground-examples {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.toolbar-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-2);
}

.example-btn {
  padding: 4px 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.example-btn:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.example-btn.active {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.toolbar-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.format-btn {
  padding: 8px 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.format-btn:hover:not(:disabled) {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.format-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.run-btn {
  padding: 8px 20px;
  border: none;
  border-radius: 8px;
  background: var(--vp-c-brand-1);
  color: var(--vp-c-white);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.run-btn:hover:not(:disabled) {
  opacity: 0.85;
}

.run-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.playground-panels {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

@media (max-width: 768px) {
  .playground-panels {
    grid-template-columns: 1fr;
  }
}

.panel-header {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--vp-c-text-3);
  margin-bottom: 6px;
}
</style>
