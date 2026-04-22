// Маршрут GET / — Главная страница Remix v3 SUT.
import { SUT_ID, FRAMEWORK_NAME } from '../lib/config.js';
import { extractRunParams, buildListHref } from '../lib/html-helpers.js';
import { html, safe } from '../lib/template.js';

// Handler главной страницы — SSR через html template tag.
export function homeHandler(req, res) {
    // Извлечение параметров прогона из URL запроса.
    const params = extractRunParams(req);
    const listHref = buildListHref(params);

    // Рендеринг HTML-страницы с автоматическим экранированием interpolation.
    const body = html`
        <!doctype html>
        <html lang="ru">
        <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>Тестовый стенд — ${FRAMEWORK_NAME}</title>
            <link rel="stylesheet" href="/shared/global.css" />
            <script type="module" src="/assets/initial-load-metrics.js"></script>
        </head>
        <body>
            <div class="layout-container">
                <header class="app-header">
                    <h1 class="app-title">Тестовый стенд</h1>
                    <div class="framework-badge">Vanilla JS</div>
                    <div class="routing-tech">Vanilla Node.js (No Framework)</div>
                </header>
                <main data-test="page-home" class="home-content"
                      data-sut-id="${SUT_ID}"
                      data-run-id="${params.runId}"
                      data-mode-id="${params.modeId}"
                      data-iteration="${params.iteration}">
                    <h2>Добро пожаловать</h2>
                    <p>Тестирование маршрутизации: <strong>${SUT_ID}</strong></p>
                    <nav style="margin-top: 2rem;">
                        <a href="${safe(listHref)}" data-test="link-to-list" class="btn-primary">
                            Перейти к списку
                        </a>
                    </nav>
                </main>
            </div>
        </body>
        </html>
    `;

    res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store'
    });
    res.end(body.toString());
}
