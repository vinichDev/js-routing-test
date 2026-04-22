// GET /list — Страница списка. Загружает данные с Data API, рендерит Document + ListPage через SSR.
// JSX компилируется esbuild (--jsx=automatic --jsx-import-source=remix/component).

import { renderToString } from 'remix/component/server';
import { createHtmlResponse } from 'remix/response/html';
import { SUT_ID } from '../lib/config.js';
import { extractRunParams } from '../lib/html-helpers.js';
import { Document } from '../components/Document.js';
import { ListPage } from '../assets/ListPage.js';

export async function listHandler(context: any) {
    const params = extractRunParams(context.request);
    const traceId = `trace-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    // Загрузка данных с Data API (SSR-fetch).
    let initialVersion = 0;
    let items: any[] = [];

    try {
        const dataApiUrl = process.env.DATA_API_URL || 'http://data-api:8080';
        const resp = await fetch(`${dataApiUrl}/api/items?version=0`, {
            headers: {
                'X-Trace-Id': traceId,
                'X-Run-Id': params.runId,
                'X-Sut-Id': SUT_ID
            }
        });
        if (resp.ok) {
            const data = await resp.json() as Record<string, any>;
            initialVersion = data.version;
            items = data.items;
        }
    } catch (e) {
        console.error('Loader SSR Data API Request failed:', e);
    }

    // Аргументы для setup-фазы ListPage (гидратируются на клиенте через rmx-data).
    const setupArgs = {
        initialVersion, items,
        runId: params.runId, modeId: params.modeId, iteration: params.iteration,
        isDirectLoad: params.isDirectLoad, traceId
    };

    // SSR-рендеринг: Document является оберткой, ListPage — интерактивным компонентом.
    // setup передаётся как специальный prop — runtime передаёт его в функцию setup-фазы,
    // а из render-фазы он исключён (см. component.js: propsWithoutSetup).
    let html = '';
    try {
        const vnode = (
            <Document>
                {/* setup — кастомный prop Remix Component runtime; cast нужен т.к. типы alpha не объявляют его в IntrinsicAttributes */}
                <ListPage {...({ setup: setupArgs } as any)} />
            </Document>
        );
        html = await renderToString(vnode);
    } catch (e: any) {
        console.error('SSR Component Rendering Failed:', e);
        html = `<html><body><div class="status-msg status-error">SSR Error: ${e.message}</div></body></html>`;
    }

    return createHtmlResponse('<!DOCTYPE html>\n' + html);
}
