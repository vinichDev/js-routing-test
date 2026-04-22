// Константы конфигурации SUT-приложения React Router v7.

export const SUT_ID = typeof process !== 'undefined'
    ? (process.env.RR_PUBLIC_SUT_ID || 'react_router_app')
    : 'react_router_app';

export const FRAMEWORK_NAME = 'React Router v7 (Vite)';

export const LIST_ITEMS_EXPECTED = 1000;

export const METRICS_SCHEMA_VERSION = '1.0';
