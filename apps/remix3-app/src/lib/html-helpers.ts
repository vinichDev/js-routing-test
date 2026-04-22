// Shared-утилиты для формирования HTML в Remix v3 SUT.

// Тип параметров прогона, извлекаемых из query-строки URL
export interface RunParams {
    runId: string;
    modeId: string;
    iteration: string;
    isDirectLoad: boolean;
}

// Извлечение параметров прогона из URL запроса.
// request — Web API Request (fetch-router передаёт стандартный Request).
export function extractRunParams(request: Request): RunParams {
    const url = new URL(request.url);
    return {
        runId: url.searchParams.get('run_id') || '',
        modeId: url.searchParams.get('mode_id') || '',
        iteration: url.searchParams.get('iteration') || '',
        // isDirectLoad: runner передаёт ?direct_load=true при прямом заходе на /list.
        // При переходе с главной страницы (SPA-подобный переход) параметр отсутствует.
        isDirectLoad: url.searchParams.get('direct_load') === 'true',
    };
}

// Формирование href для ссылки на /list с проброшенными query-параметрами.
// Формирование href для ссылки на /list с проброшенными query-параметрами.
export function buildListHref(params: Pick<RunParams, 'runId' | 'modeId' | 'iteration'>): string {
    const query = new URLSearchParams();
    if (params.runId) query.set('run_id', params.runId);
    if (params.modeId) query.set('mode_id', params.modeId);
    if (params.iteration) query.set('iteration', params.iteration);
    const qs = query.toString();
    return `/list${qs ? '?' + qs : ''}`;
}
