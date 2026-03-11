<script setup lang="ts">
import { ref, shallowRef } from 'vue';
import MonacoEditor from './MonacoEditor.vue';
import OutputPanel from './OutputPanel.vue';

const examples = [
  {
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
];

const code = ref(examples[0].code);
const result = ref<string | null>(null);
const error = ref<string | null>(null);
const parseResult = ref<{ success: boolean; error?: string } | null>(null);
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

function selectExample(index: number) {
  code.value = examples[index].code;
  result.value = null;
  error.value = null;
  parseResult.value = null;
}

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

  // Try to detect schema from .generate(schemaVar) call in the result line
  let schemaVar: string | null = null;
  if (resultLine) {
    const genMatch = resultLine.match(/\.generate\((\w+)\)/);
    if (genMatch && varNames.includes(genMatch[1])) {
      schemaVar = genMatch[1];
    }
  }

  // Fallback: find a variable named "schema" or ending with "Schema"
  if (!schemaVar) {
    const found = varNames.find(
      (v) =>
        v !== resultVar &&
        (v === 'schema' || v.endsWith('Schema')),
    );
    // Only use fallback if there's exactly one schema-like variable
    const allSchemaVars = varNames.filter(
      (v) =>
        v !== resultVar &&
        (v === 'schema' || v.endsWith('Schema')),
    );
    if (allSchemaVars.length === 1) {
      schemaVar = found ?? null;
    }
  }

  if (schemaVar) {
    lines.push(
      `return { __result: ${resultVar}, __schema: ${schemaVar} };`,
    );
  } else {
    lines.push(`return { __result: ${resultVar} };`);
  }

  return lines.join('\n');
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
          () => reject(new Error('実行タイムアウト (5秒)')),
          timeoutMs,
        ),
      ),
    ]);

    // 7. Extract result and schema, then serialize
    const wrapped = resultValue as
      | { __result: unknown; __schema?: { safeParse: (v: unknown) => { success: boolean; error?: { message: string } } } }
      | undefined;

    const actualResult = wrapped?.__result ?? resultValue;
    const schemaObj = wrapped?.__schema;

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
    error.value = e instanceof Error ? e.message : String(e);
  } finally {
    isRunning.value = false;
  }
}
</script>

<template>
  <div class="playground">
    <div class="playground-header">
      <h1>Playground</h1>
      <p>Zodスキーマを入力してモックデータを生成できます。コードを編集して「Generate Mock」ボタンを押してください。</p>
    </div>
    <div class="playground-toolbar">
      <div class="playground-examples">
        <span class="toolbar-label">Examples:</span>
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
          {{ isRunning ? '実行中...' : '▶ Generate Mock' }}
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
        <OutputPanel :result="result" :error="error" :is-running="isRunning" :parse-result="parseResult" />
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
