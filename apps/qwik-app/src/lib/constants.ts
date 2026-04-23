// VITE_SUT_ID injected at build time via Docker ARG
export const SUT_ID: string = (import.meta as any).env?.VITE_SUT_ID || 'qwik_app';
export const FRAMEWORK_NAME = 'Qwik 1.x + QwikCity (Resumability, SPA router)';
export const LIST_ITEMS_EXPECTED = 1000;
export const METRICS_SCHEMA_VERSION = '1.0';
