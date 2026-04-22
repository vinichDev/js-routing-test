// Конфигурация SUT-приложения Remix v3 из переменных окружения.

// Идентификатор тестируемого приложения.
export const SUT_ID = process.env.SUT_ID || 'remix3_app';

// HTTP-порт сервера.
export const PORT = Number(process.env.PORT || 3000);

// Человекочитаемое название фреймворка для UI.
export const FRAMEWORK_NAME = 'Remix v3 (alpha)';

// Ожидаемое количество элементов списка для assertions.
export const LIST_ITEMS_EXPECTED = 1000;

// Версия схемы метрик.
export const METRICS_SCHEMA_VERSION = '1.0';
