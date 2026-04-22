// =============================================================================
// Remix v3 Component: ListPage
// Двухфазный компонент для рендеринга списка элементов тестового стенда.
// Использует официальную модель Remix Component (Setup + Render).
// =============================================================================

// JSX компилируется через automatic transform (--jsx-import-source=remix/component).
// Ручной импорт createElement не нужен.
import { clientEntry } from 'remix/component';

// Константа идентификатора SUT
const SUT_ID = 'remix3_app';

function createId(prefix: string) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function ListPageComponent(handle: any, initialSetup: any) {
    let { initialVersion, items, runId, modeId, iteration, isDirectLoad, traceId } = initialSetup;

    let currentVersion = Number(initialVersion);
    let regenIndex = 0;
    let loading = false;
    let errorMsg: string | null = null;

    if (modeId !== 'warmup') {
        handle.queueTask(() => {
            // RAF выравнивает точку замера с остальными SUT (Next.js, Remix v2, SvelteKit),
            // которые тоже используют requestAnimationFrame для захвата tDomReady.
            // Без RAF tDomReady захватывался бы внутри микрозадачи (postCommitTasks),
            // до RAF и до paint — что давало систематически заниженные значения.
            requestAnimationFrame(() => {
                const tNow = performance.now();
                const t0Raw = sessionStorage.getItem('nav_t0');
                const t0Click = t0Raw !== null ? parseFloat(t0Raw) : null;
                // nav_t0 — Date.now() момента клика; performance.timeOrigin — абсолютное
                // время старта страницы. Разница даёт длительность навигации.
                const navDuration = t0Click !== null
                    ? (performance.timeOrigin + tNow) - t0Click
                    : tNow;
                // Для full-page reload: TTFB новой страницы = момент получения данных от сервера.
                const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
                const tDataReadyMs = navEntry
                    ? (t0Click !== null
                        ? (performance.timeOrigin + navEntry.responseStart) - t0Click
                        : navEntry.responseStart)
                    : null;
                sessionStorage.removeItem('nav_t0');
                import('./metrics.js').then(({ sendRouteNavigationMetrics }) => {
                    sendRouteNavigationMetrics({
                        runId, sutId: SUT_ID, modeId, iteration,
                        isDirectLoad, traceId, version: currentVersion,
                        navDuration, tDataReadyMs, itemsCount: items.length,
                    });
                });
            });
        });
    }

    async function regenerate() {
        loading = true;
        errorMsg = null;
        regenIndex++;
        handle.update();

        const t0 = performance.now();
        const nextTrace = createId('trace');

        try {
            const resp = await fetch(`/api/items?version=${currentVersion + 1}`, {
                headers: { 'X-Trace-Id': nextTrace, 'X-Run-Id': runId, 'X-Sut-Id': SUT_ID }
            });
            if (!resp.ok) throw new Error(`Status ${resp.status}`);

            const json = await resp.json() as Record<string, any>;
            const tDataReady = performance.now();

            currentVersion = json.version;
            items = json.items;
            loading = false;

            handle.queueTask(() => {
                // RAF выравнивает точку замера с остальными SUT (Next.js, Remix v2, SvelteKit).
                // queueTask запускается в postCommitTasks внутри микрозадачи — до RAF и paint.
                // Без RAF tDomReady был бы систематически меньше, чем у других SUT.
                requestAnimationFrame(() => {
                    const tDomReady = performance.now();
                    if (modeId !== 'warmup') {
                        import('./metrics.js').then(({ sendListRegenerationMetrics }) => {
                            sendListRegenerationMetrics({
                                runId, sutId: SUT_ID, modeId, iteration,
                                traceId: nextTrace, version: currentVersion, regenIndex,
                                t0, tDataReady, tDomReady, itemsCount: items.length
                            });
                        });
                    }
                });
            });

            handle.update();
        } catch (e: any) {
            errorMsg = e.message;
            loading = false;
            handle.update();
        }
    }

    return () => (
        <main
            data-test="page-list"
            data-sut-id={SUT_ID}
            data-run-id={runId}
            data-mode-id={modeId}
            data-iteration={iteration}
        >
            <div className="list-controls">
                <div>
                    <h2>Данные</h2>
                    <p className="items-stat" data-test="items-count">
                        Элементов: {items.length}
                    </p>
                </div>
                <button
                    className="btn-primary"
                    data-test="btn-regenerate"
                    disabled={loading}
                    on={{ click: regenerate }}
                >
                    Сгенерировать новый список
                </button>
            </div>

            {loading && (
                <div className="status-msg status-loading" data-test="loading-state">
                    Загрузка...
                </div>
            )}

            {errorMsg && (
                <div className="status-msg status-error" data-test="error-state">
                    Ошибка: {errorMsg}
                </div>
            )}

            <div className="list-container" data-test="list-container" data-version={currentVersion}>
                {items.map((item: any) => (
                    <div className="list-item-card" data-test="list-item" data-id={item.id} key={item.id}>
                        <div className="item-avatar">{item.title.charAt(0)}</div>
                        <div className="item-content">
                            <h3 className="item-title">{item.title}</h3>
                            <p className="item-desc">{item.description}</p>
                            <div className="item-meta">
                                <span className="item-badge">{item.group}</span>
                                <span className="item-value">Value: {item.value}</span>
                            </div>
                        </div>
                        <div className="item-actions">
                            <button className="btn-icon">🔧</button>
                            <button className="btn-icon">🗑</button>
                        </div>
                    </div>
                ))}
            </div>
        </main>
    );
}

// Экспорт компонента с пометкой clientEntry для автогидратации.
// Обратите внимание: URL модуля скомпилирован в .js, поэтому мы оставляем '/assets/ListPage.js'
export const ListPage = clientEntry(
    '/assets/ListPage.js#ListPage',
    ListPageComponent
);
