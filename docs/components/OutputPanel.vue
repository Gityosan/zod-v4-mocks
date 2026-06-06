<script setup lang="ts">
type PreflightDiagnostic = {
  level: 'error' | 'warning'
  path: string
  message: string
}

defineProps<{
  result: string | null
  error: string | null
  isRunning: boolean
  parseResult: { success: boolean; error?: string } | null
  preflightResult: PreflightDiagnostic[] | null
  runningText: string
  placeholderText: string
  preflightText: string
  noIssuesText: string
  warningText: string
  errorText: string
}>()
</script>

<template>
  <div class="output-panel">
    <div v-if="isRunning" class="output-loading">
      <span class="spinner" />
      {{ runningText }}
    </div>
    <template v-else>
      <div v-if="preflightResult" class="preflight">
        <div class="preflight-header">
          <span class="preflight-label">{{ preflightText }}</span>
          <span
            v-if="preflightResult.length === 0"
            class="preflight-badge preflight-badge-clean"
          >
            ✓ {{ noIssuesText }}
          </span>
        </div>
        <ul v-if="preflightResult.length > 0" class="preflight-list">
          <li
            v-for="(d, i) in preflightResult"
            :key="i"
            class="preflight-item"
            :class="`preflight-item-${d.level}`"
          >
            <span class="preflight-item-badge">
              {{ d.level === 'error' ? errorText : warningText }}
            </span>
            <span class="preflight-item-body">
              <code class="preflight-item-path">{{ d.path }}</code>
              <span class="preflight-item-message">{{ d.message }}</span>
            </span>
          </li>
        </ul>
      </div>
      <div v-if="error" class="output-error">
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
      <div v-else-if="!preflightResult" class="output-placeholder">
        {{ placeholderText }}
      </div>
    </template>
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

.preflight {
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.preflight-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.preflight-label {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--vp-c-text-3);
}

.preflight-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.preflight-badge-clean {
  background: var(--vp-c-green-soft, rgba(16, 185, 129, 0.14));
  color: var(--vp-c-green-1, #10b981);
}

.preflight-list {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preflight-item {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 8px 10px;
  border-radius: 4px;
}

.preflight-item-warning {
  background: var(--vp-c-yellow-soft, rgba(234, 179, 8, 0.14));
}

.preflight-item-error {
  background: var(--vp-c-red-soft, rgba(244, 63, 94, 0.14));
}

.preflight-item-badge {
  flex-shrink: 0;
  padding: 1px 7px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.preflight-item-warning .preflight-item-badge {
  background: var(--vp-c-yellow-1, #eab308);
  color: var(--vp-c-bg, #fff);
}

.preflight-item-error .preflight-item-badge {
  background: var(--vp-c-red-1, #f43f5e);
  color: var(--vp-c-bg, #fff);
}

.preflight-item-body {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.preflight-item-path {
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  background: none;
  padding: 0;
}

.preflight-item-message {
  font-size: 12px;
  line-height: 1.45;
  color: var(--vp-c-text-2);
  white-space: normal;
  word-break: break-word;
}

.output-placeholder {
  color: var(--vp-c-text-3);
  padding: 16px;
  text-align: center;
}
</style>
