// Константы конфигурации SUT-приложения Remix v2.

// Идентификатор тестируемого приложения (из переменной окружения или fallback).
// В Remix v2 с Vite серверные env доступны через process.env в loader.
export const SUT_ID = typeof process !== 'undefined'
    ? (process.env.REMIX_PUBLIC_SUT_ID || 'remix_app')
    : 'remix_app';

// Человекочитаемое название фреймворка для UI.
export const FRAMEWORK_NAME = 'Remix v2 (Vite)';

// Ожидаемое количество элементов списка для assertions.
export const LIST_ITEMS_EXPECTED = 1000;

// Версия схемы метрик для обратной совместимости.
export const METRICS_SCHEMA_VERSION = '1.0';
