// Shared-утилиты для SUT-приложения Next.js.

// Формирование уникального идентификатора на основе времени и случайной компоненты.
export function createId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// Инкапсуляция отправки JSON-сообщения по относительному URL.
export async function postJson(url: string, payload: unknown): Promise<void> {
    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        cache: 'no-store',
        keepalive: true,
    });
}
