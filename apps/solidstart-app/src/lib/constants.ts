// VITE_SUT_ID injected at build time via Docker ARG
export const SUT_ID: string = (import.meta as any).env?.VITE_SUT_ID || 'solidstart_app'
export const FRAMEWORK_NAME = 'SolidStart v1 (SolidJS 1.9)'
export const LIST_ITEMS_EXPECTED = 1000
export const METRICS_SCHEMA_VERSION = '1.0'
