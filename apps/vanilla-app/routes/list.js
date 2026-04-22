import { SUT_ID, FRAMEWORK_NAME } from '../lib/config.js';
import { extractRunParams } from '../lib/html-helpers.js';
import { html, safe } from '../lib/template.js';

export async function listHandler(req, res) {
    const params = extractRunParams(req);
    const traceId = `trace-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    let itemsHtml = '';
    let initialVersion = 0;
    let itemCount = 0;

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
            const data = await (resp.json());
            initialVersion = data.version;
            itemCount = data.items.length;
            
            itemsHtml = data.items.map(item => `
                <div class="list-item-card" data-test="list-item" data-id="${item.id}">
                    <div class="item-avatar">${item.title.charAt(0)}</div>
                    <div class="item-content">
                        <h3 class="item-title">${item.title}</h3>
                        <p class="item-desc">${item.description}</p>
                        <div class="item-meta">
                            <span class="item-badge">${item.group}</span>
                            <span class="item-value">Value: ${item.value}</span>
                        </div>
                    </div>
                    <div class="item-actions">
                        <button class="btn-icon">🔧</button>
                        <button class="btn-icon">🗑</button>
                    </div>
                </div>
            `).join('');
        }
    } catch (e) {
        console.error('Loader SSR Data API Request failed:', e);
    }

    const body = html`
        <!doctype html>
        <html lang="ru">
        <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>Список элементов — ${FRAMEWORK_NAME}</title>
            <link rel="stylesheet" href="/shared/global.css" />
        </head>
        <body>
            <div class="layout-container">
                <header class="app-header">
                    <h1 class="app-title">Тестовый стенд</h1>
                    <div class="framework-badge">Vanilla JS</div>
                    <div class="routing-tech">Vanilla Node.js (No Framework)</div>
                </header>

                <main data-test="page-list"
                      data-sut-id="${SUT_ID}"
                      data-run-id="${params.runId}"
                      data-mode-id="${params.modeId}"
                      data-iteration="${params.iteration}">
                    
                    <div class="list-controls">
                        <div>
                            <h2>Данные</h2>
                            <p class="items-stat" data-test="items-count">Элементов: ${itemCount}</p>
                        </div>
                        <button class="btn-primary" data-test="btn-regenerate">
                            Сгенерировать новый список
                        </button>
                    </div>

                    <div class="status-msg status-loading" data-test="loading-state" style="display:none">Загрузка...</div>
                    <div class="status-msg status-error" data-test="error-state" style="display:none"></div>

                    <div class="list-container" data-test="list-container" data-version="${initialVersion}" data-loader-trace="${traceId}">
                        ${safe(itemsHtml)}
                    </div>
                </main>
            </div>

            <template id="list-item-template">
                <div class="list-item-card" data-test="list-item" data-id="">
                    <div class="item-avatar"></div>
                    <div class="item-content">
                        <h3 class="item-title"></h3>
                        <p class="item-desc"></p>
                        <div class="item-meta">
                            <span class="item-badge"></span>
                            <span class="item-value"></span>
                        </div>
                    </div>
                    <div class="item-actions">
                        <button class="btn-icon">🔧</button>
                        <button class="btn-icon">🗑</button>
                    </div>
                </div>
            </template>

            <!-- Клиентский скрипт для регенерации: метрики, гидратация кнопок -->
            <script type="module" src="/assets/list-page.js"></script>
            <script type="module" src="/assets/initial-load-metrics.js"></script>
        </body>
        </html>
    `;

    res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store'
    });
    res.end(body.toString());
}
