// Константы конфигурации SUT-приложения Next.js.

// Идентификатор тестируемого приложения (из переменной окружения).
export const SUT_ID = process.env.NEXT_PUBLIC_SUT_ID || 'next_app';

// Человекочитаемое название фреймворка для UI.
export const FRAMEWORK_NAME = 'Next.js App Router';

// Ожидаемое количество элементов списка для assertions.
export const LIST_ITEMS_EXPECTED = 1000;

// Версия схемы метрик для обратной совместимости.
export const METRICS_SCHEMA_VERSION = '1.0';
