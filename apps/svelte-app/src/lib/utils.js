/**
 * Генерация уникального идентификатора на основе времени и случайной компоненты.
 * @param {string} prefix
 * @returns {string}
 */
export function createId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Отправка JSON-данных на endpoint метрик.
 * @param {string} url
 * @param {object} data
 * @returns {Promise<void>}
 */
export async function postJson(url, data) {
    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}
