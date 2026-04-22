// =============================================================================
// Document — корневой HTML-shell компонент для всех страниц Remix v3 SUT.
// Следует официальному демо bookstore: клиентские ассеты бандлятся esbuild,
// никакого Import Map и прямых ссылок на node_modules.
// =============================================================================

// Автоматический JSX-трансформ (--jsx=automatic --jsx-import-source=remix/component)
// автоматически добавляет import { jsx as _jsx } from 'remix/component/jsx-runtime'.
// Ручной импорт createElement не нужен.
import { FRAMEWORK_NAME } from '../lib/config.js';

// Setup-фаза: handle первый аргумент (Remix Component convention).
// setup — второй аргумент, здесь не используется.
export function Document(handle: any, setup: any) {
    // Render-фаза: props содержат children (контент конкретной страницы).
    return (props: any) => (
        <html lang="ru">
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <title>Тестовый стенд — {FRAMEWORK_NAME}</title>
                <link rel="stylesheet" href="/shared/global.css" />

                {/*
                  * Метрики начальной загрузки (Initial Load / Web Vitals).
                  * Загружается отдельно, чтобы зафиксировать FCP/LCP до гидратации.
                  * Бандл включает только нативные Performance API — нет зависимостей.
                  */}
                <script type="module" src="/assets/initial-load-metrics.js"></script>
            </head>
            <body>
                <div className="layout-container">
                    <header className="app-header">
                        <h1 className="app-title">Тестовый стенд</h1>
                        <div className="framework-badge">Remix v3 Component</div>
                        <div className="routing-tech">Remix Component Two-Phase Model (SSR + Hydration)</div>
                    </header>

                    {/* Контент страницы (home-content или ListPage) */}
                    <div id="remix-root">
                        {props.children}
                    </div>
                </div>

                {/*
                  * Клиентский entry point — бандл esbuild включает remix/component.
                  * Инициализирует run() для гидратации clientEntry-компонентов.
                  * Загружается после body, чтобы не блокировать рендер.
                  */}
                <script type="module" src="/assets/entry.js"></script>
            </body>
        </html>
    );
}
