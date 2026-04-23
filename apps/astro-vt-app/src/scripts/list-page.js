// Клиентский скрипт страницы списка для Astro VT SUT.
// Модуль загружается один раз; все события (VT-навигация + повторные) ловит
// через astro:page-load. NAV-замер использует sessionStorage nav_t0 (паттерн SPA)
// и window.__vtDataReadyTime (astro:before-swap) для разбивки Server+Net / Render.
import { sendRouteNavigationMetrics, sendListRegenerationMetrics } from './metrics.js';

function createId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// =============================================================================
// Настройка страницы — вызывается после каждой VT-навигации на /list.
// =============================================================================
function setupListPage() {
    const pageEl = document.querySelector('[data-test="page-list"]');
    if (!pageEl) return; // Не на странице списка.

    const SUT_ID = pageEl.dataset.sutId || 'astro_vt_app';
    const RUN_ID = pageEl.dataset.runId || createId('run');
    const MODE_ID = pageEl.dataset.modeId || 'manual';
    const ITERATION = Number(pageEl.dataset.iteration || '1');

    const container = document.querySelector('[data-test="list-container"]');
    const countEl = document.querySelector('[data-test="items-count"]');
    const loadingEl = document.querySelector('[data-test="loading-state"]');
    const errorEl = document.querySelector('[data-test="error-state"]');
    const btn = document.querySelector('[data-test="btn-regenerate"]');

    let currentVersion = Number(container?.dataset.version || '0');
    let regenIndex = 0;
    let t0 = 0;

    // -------------------------------------------------------------------------
    // NAV-метрика.
    // nav_t0 (Date.now при клике) задаётся в initial-load-metrics.js.
    // window.__vtDataReadyTime (Date.now при astro:before-swap) = сервер готов.
    // -------------------------------------------------------------------------
    if (MODE_ID !== 'warmup') {
        const tNow = performance.now();
        const t0Raw = sessionStorage.getItem('nav_t0');
        const t0Click = t0Raw !== null ? parseFloat(t0Raw) : null;
        sessionStorage.removeItem('nav_t0');

        const isVtNav = t0Click !== null;

        let navDuration, tDataReadyMs;

        if (isVtNav) {
            // VT-навигация: абсолютное время через performance.timeOrigin + tNow.
            navDuration = performance.timeOrigin + tNow - t0Click;
            const vtDataReadyTime = window.__vtDataReadyTime;
            // vtDataReadyTime — Date.now() на astro:before-swap = сервер закончил fetch.
            tDataReadyMs = vtDataReadyTime !== null ? vtDataReadyTime - t0Click : null;
        } else {
            // Прямая загрузка: tNow = performance.now() от начала навигации.
            navDuration = tNow;
            const navEntry = performance.getEntriesByType('navigation')[0];
            tDataReadyMs = navEntry ? navEntry.responseStart : null;
        }

        const traceId = container?.dataset.loaderTrace || createId('trace');
        const itemsCount =
            container?.querySelectorAll('[data-test="list-item"]').length || 0;

        sendRouteNavigationMetrics({
            runId: RUN_ID,
            sutId: SUT_ID,
            modeId: MODE_ID,
            iteration: ITERATION,
            isDirectLoad: !isVtNav,
            traceId,
            version: currentVersion,
            navDuration,
            tDataReadyMs,
            itemsCount,
        });
    }

    // -------------------------------------------------------------------------
    // Клиентская регенерация списка.
    // -------------------------------------------------------------------------
    async function loadItems(nextVersion, nextRegenIndex) {
        loadingEl.style.display = '';
        errorEl.style.display = 'none';
        btn.disabled = true;

        try {
            t0 = performance.now();
            const traceId = createId('trace');

            const resp = await fetch(`/api/items?version=${nextVersion}`, {
                method: 'GET',
                headers: {
                    'X-Trace-Id': traceId,
                    'X-Run-Id': RUN_ID,
                    'X-Sut-Id': SUT_ID,
                },
                cache: 'no-store',
            });

            if (!resp.ok) throw new Error(`Data API responded with status ${resp.status}`);

            const json = await resp.json();
            const tDataReady = performance.now();

            if (!Array.isArray(json.items)) throw new Error("Response field 'items' is not an array");

            currentVersion = json.version;

            // Рендеринг через <template> (W3C safe cloning).
            const template = document.getElementById('list-item-template');
            const fragment = document.createDocumentFragment();

            json.items.forEach((item) => {
                const clone = template.content.cloneNode(true);
                const card = clone.querySelector('.list-item-card');
                card.dataset.id = item.id;
                clone.querySelector('.item-avatar').textContent = item.title.charAt(0);
                clone.querySelector('.item-title').textContent = item.title;
                clone.querySelector('.item-desc').textContent = item.description;
                clone.querySelector('.item-badge').textContent = item.group;
                clone.querySelector('.item-value').textContent = `Value: ${item.value}`;
                fragment.appendChild(clone);
            });

            container.innerHTML = '';
            container.dataset.version = String(json.version);
            container.appendChild(fragment);
            countEl.textContent = `Элементов: ${json.items.length}`;

            requestAnimationFrame(() => {
                const tDomReady = performance.now();

                if (MODE_ID !== 'warmup') {
                    sendListRegenerationMetrics({
                        runId: RUN_ID,
                        sutId: SUT_ID,
                        modeId: MODE_ID,
                        iteration: ITERATION,
                        traceId,
                        version: json.version,
                        regenIndex: nextRegenIndex,
                        t0,
                        tDataReady,
                        tDomReady,
                        itemsCount: json.items.length,
                    });
                }

                loadingEl.style.display = 'none';
                btn.disabled = false;
            });
        } catch (error) {
            console.error('List loading failed', error);
            errorEl.style.display = '';
            errorEl.textContent = `Ошибка: ${error instanceof Error ? error.message : 'Unknown error'}`;
            loadingEl.style.display = 'none';
            btn.disabled = false;
        }
    }

    btn?.addEventListener('click', () => {
        regenIndex += 1;
        loadItems(currentVersion + 1, regenIndex);
    });
}

// Слушатель живёт на document — переживает VT-навигацию.
// Он вызывается и при первоначальной загрузке, и после каждого VT-перехода.
document.addEventListener('astro:page-load', setupListPage);
