// SSR-загрузка данных для страницы списка.
// TransferState передаёт данные от SSR к клиенту без повторного HTTP-запроса при гидратации.
// При SPA-навигации TransferState пуст — resolver делает обычный fetch через nginx proxy.
import { inject, PLATFORM_ID } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { TransferState, makeStateKey } from '@angular/platform-browser';
import { isPlatformServer } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { DATA_API_BASE_URL, SUT_ID } from '../../lib/constants';
import { ListLoaderData, ApiResponse } from '../../lib/types';
import { createId } from '../../lib/utils';

const LIST_STATE_KEY = makeStateKey<ListLoaderData>('angular-list-data');

export const listResolver: ResolveFn<ListLoaderData> = async (route) => {
    const http = inject(HttpClient);
    const transferState = inject(TransferState);
    const platformId = inject(PLATFORM_ID);

    const runId = route.queryParamMap.get('run_id') || '';
    const modeId = route.queryParamMap.get('mode') || 'manual';
    const iteration = parseInt(route.queryParamMap.get('iteration') || '1', 10);

    // Клиент при гидратации: берём данные из SSR TransferState (нет повторного запроса).
    if (!isPlatformServer(platformId) && transferState.hasKey(LIST_STATE_KEY)) {
        const cached = transferState.get(LIST_STATE_KEY, null)!;
        transferState.remove(LIST_STATE_KEY); // очищаем: следующая SPA-навигация запросит свежие данные
        return { ...cached, runId, modeId, iteration };
    }

    // Сервер или SPA-навигация: fetch данных.
    const dataApiBaseUrl = isPlatformServer(platformId)
        ? (inject(DATA_API_BASE_URL, { optional: true }) ?? 'http://data-api:8080')
        : '';
    const traceId = createId('ang');

    const resp = await firstValueFrom(
        http.get<ApiResponse>(`${dataApiBaseUrl}/api/items?version=0`, {
            headers: { 'X-Trace-Id': traceId, 'X-Sut-Id': SUT_ID },
        }),
    );

    const data: ListLoaderData = {
        items: resp.items,
        version: resp.version,
        traceId,
        runId,
        modeId,
        iteration,
    };

    // Сервер: сохраняем в TransferState для передачи клиенту.
    if (isPlatformServer(platformId)) {
        transferState.set(LIST_STATE_KEY, data);
    }

    return data;
};
