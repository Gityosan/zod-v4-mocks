<script setup lang="ts">
defineProps<{
  result: string | null
  error: string | null
  isRunning: boolean
  parseResult: { success: boolean; error?: string } | null
  runningText: string
  placeholderText: string
}>()
</script>

<template>
  <div class="output-panel">
    <div v-if="isRunning" class="output-loading">
      <span class="spinner" />
      {{ runningText }}
    </div>
    <div v-else-if="error" class="output-error">
      <div class="output-error-title">Error</div>
      <pre class="output-error-message">{{ error }}</pre>
    </div>
    <div v-else-if="result" class="output-success">
      <div v-if="parseResult" class="parse-result">
        <span v-if="parseResult.success" class="parse-badge parse-badge-success">
          schema.parse ✓
        </span>
        <details v-else class="parse-details">
          <summary class="parse-badge parse-badge-fail">
            schema.parse ✗
          </summary>
          <pre class="parse-error-detail">{{ parseResult.error }}</pre>
        </details>
      </div>
      <pre class="output-json">{{ result }}</pre>
    </div>
    <div v-else class="output-placeholder">
      {{ placeholderText }}
    </div>
  </div>
</template>

<style scoped>
.output-panel {
  width: 100%;
  height: 400px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: auto;
  background: var(--vp-c-bg-soft);
  padding: 12px;
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
}

.output-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--vp-c-text-2);
  padding: 16px;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--vp-c-divider);
  border-top-color: var(--vp-c-brand-1);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.output-error {
  color: var(--vp-c-danger-1);
}

.output-error-title {
  font-weight: 700;
  margin-bottom: 8px;
}

.output-error-message {
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
}

.output-success pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.parse-result {
  margin-bottom: 10px;
}

.parse-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  font-family: var(--vp-font-family-mono);
}

.parse-badge-success {
  background: var(--vp-c-green-soft, rgba(16, 185, 129, 0.14));
  color: var(--vp-c-green-1, #10b981);
}

.parse-badge-fail {
  background: var(--vp-c-red-soft, rgba(244, 63, 94, 0.14));
  color: var(--vp-c-red-1, #f43f5e);
  cursor: pointer;
  list-style: none;
}

.parse-badge-fail::-webkit-details-marker {
  display: none;
}

.parse-details {
  display: inline;
}

.parse-error-detail {
  margin: 8px 0 0;
  padding: 8px 10px;
  border-radius: 4px;
  background: var(--vp-c-red-soft, rgba(244, 63, 94, 0.14));
  color: var(--vp-c-red-1, #f43f5e);
  font-size: 11px;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 120px;
  overflow: auto;
}

.output-placeholder {
  color: var(--vp-c-text-3);
  padding: 16px;
  text-align: center;
}
</style>
