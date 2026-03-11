<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useData } from 'vitepress'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'ready': []
}>()

const editorContainer = ref<HTMLDivElement>()
const { isDark } = useData()

let editor: any = null
let monaco: any = null
let resizeObserver: ResizeObserver | null = null

onMounted(async () => {
  const loader = await import('@monaco-editor/loader')
  monaco = await loader.default.init()

  // Configure TypeScript compiler options
  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ES2022,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    strict: true,
    esModuleInterop: true,
    allowJs: true,
    noEmit: false,
    allowNonTsExtensions: true,
  })

  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
  })

  // Load type definitions for editor autocompletion
  try {
    const base = import.meta.env.BASE_URL || '/zod-v4-mocks/'
    const [zodTypes, mocksTypes] = await Promise.all([
      fetch(`${base}types/zod.d.ts`).then((r) => r.text()),
      fetch(`${base}types/zod-v4-mocks.d.ts`).then((r) => r.text()),
    ])

    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      zodTypes,
      'file:///node_modules/zod/index.d.ts',
    )
    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      mocksTypes,
      'file:///node_modules/zod-v4-mocks/index.d.ts',
    )
  } catch (e) {
    console.warn('Failed to load type definitions:', e)
  }

  // Create editor instance
  editor = monaco.editor.create(editorContainer.value!, {
    value: props.modelValue,
    language: 'typescript',
    theme: isDark.value ? 'vs-dark' : 'vs',
    minimap: { enabled: false },
    fontSize: 14,
    lineNumbers: 'on',
    scrollBeyondLastLine: false,
    automaticLayout: false,
    tabSize: 2,
    padding: { top: 12 },
    scrollbar: { alwaysConsumeMouseWheel: false },
  })

  // Manual resize handling to avoid infinite layout loop
  resizeObserver = new ResizeObserver(() => {
    editor?.layout()
  })
  resizeObserver.observe(editorContainer.value!)

  editor.onDidChangeModelContent(() => {
    emit('update:modelValue', editor.getValue())
  })

  emit('ready')
})

watch(
  () => props.modelValue,
  (newValue) => {
    if (editor && editor.getValue() !== newValue) {
      editor.setValue(newValue)
    }
  },
)

watch(isDark, (dark) => {
  if (monaco) {
    monaco.editor.setTheme(dark ? 'vs-dark' : 'vs')
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  editor?.dispose()
})

async function getTranspiledCode(): Promise<string> {
  if (!editor || !monaco) throw new Error('Editor not ready')

  const model = editor.getModel()
  const worker = await monaco.languages.typescript.getTypeScriptWorker()
  const client = await worker(model.uri)
  const output = await client.getEmitOutput(model.uri.toString())

  if (output.outputFiles.length === 0) {
    throw new Error('Transpilation produced no output')
  }

  return output.outputFiles[0].text
}

async function formatCode(): Promise<void> {
  if (!editor) return
  await editor.getAction('editor.action.formatDocument')?.run()
}

defineExpose({ getTranspiledCode, formatCode })
</script>

<template>
  <div ref="editorContainer" class="monaco-editor-container" />
</template>

<style scoped>
.monaco-editor-container {
  width: 100%;
  height: 400px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
}
</style>
