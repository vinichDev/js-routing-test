// Идентификатор SUT — injected через Docker build arg → env var.
// Используется во всех метриках для идентификации источника.
export const SUT_ID = process.env.SUT_ID || 'svelte_app';
export const FRAMEWORK_NAME = 'SvelteKit';
export const LIST_ITEMS_EXPECTED = 1000;
export const METRICS_SCHEMA_VERSION = '1.0';
