// Shared-утилиты для формирования HTML в Remix v3 SUT.

// Извлечение параметров прогона из URL запроса.
// req — объект IncomingMessage (node:http), у которого req.url содержит только путь.
// Используем заголовок host для построения полного абсолютного URL.
export function extractRunParams(req) {
    const base = `http://${req.headers?.host || 'localhost'}`;
    const url = new URL(req.url, base);
    return {
        runId: url.searchParams.get('run_id') || '',
        modeId: url.searchParams.get('mode_id') || '',
        iteration: url.searchParams.get('iteration') || '',
    };
}

// Формирование href для ссылки на /list с проброшенными query-параметрами.
export function buildListHref(params) {
    const query = new URLSearchParams();
    if (params.runId) query.set('run_id', params.runId);
    if (params.modeId) query.set('mode_id', params.modeId);
    if (params.iteration) query.set('iteration', params.iteration);
    const qs = query.toString();
    return `/list${qs ? '?' + qs : ''}`;
}
