// Клиентский скрипт страницы списка для Astro MPA SUT.
// Выполняет отправку метрик навигации и регенерацию списка.
import { sendRouteNavigationMetrics, sendListRegenerationMetrics } from './metrics.js';

function createId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// Инициализация констант из data-атрибутов страницы.
const pageEl = document.querySelector('[data-test="page-list"]');
const SUT_ID = pageEl?.dataset.sutId || 'astro_app';
const RUN_ID = pageEl?.dataset.runId || createId('run');
const MODE_ID = pageEl?.dataset.modeId || 'manual';
const ITERATION = Number(pageEl?.dataset.iteration || '1');

const urlParams = new URLSearchParams(window.location.search);
const isDirectLoad = urlParams.get('direct_load') === 'true';

const container = document.querySelector('[data-test="list-container"]');
const countEl = document.querySelector('[data-test="items-count"]');
const loadingEl = document.querySelector('[data-test="loading-state"]');
const errorEl = document.querySelector('[data-test="error-state"]');
const btn = document.querySelector('[data-test="btn-regenerate"]');

let currentVersion = Number(container?.dataset.version || '0');
let regenIndex = 0;
let t0 = 0;

// =============================================================================
// Отправка метрики навигации при первой загрузке страницы (NAV).
// =============================================================================
function sendInitialMetrics() {
    if (MODE_ID === 'warmup') return;

    requestAnimationFrame(() => {
        const tNow = performance.now();
        const t0Raw = sessionStorage.getItem('nav_t0');
        const t0Click = t0Raw !== null ? parseFloat(t0Raw) : null;
        const navDuration = t0Click !== null
            ? (performance.timeOrigin + tNow) - t0Click
            : tNow;

        // Для full-page reload: TTFB от начала навигации до responseStart.
        const navEntry = performance.getEntriesByType('navigation')[0];
        const tDataReadyMs = navEntry
            ? (t0Click !== null
                ? (performance.timeOrigin + navEntry.responseStart) - t0Click
                : navEntry.responseStart)
            : null;

        sessionStorage.removeItem('nav_t0');

        const traceId = container?.dataset.loaderTrace || createId('trace');
        const itemsCount = container?.querySelectorAll('[data-test="list-item"]').length || 0;

        sendRouteNavigationMetrics({
            runId: RUN_ID,
            sutId: SUT_ID,
            modeId: MODE_ID,
            iteration: ITERATION,
            isDirectLoad,
            traceId,
            version: currentVersion,
            navDuration,
            tDataReadyMs,
            itemsCount,
        });
    });
}
sendInitialMetrics();

// =============================================================================
// Клиентская регенерация списка.
// =============================================================================
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

        // Рендеринг новых элементов через <template> (W3C safe cloning).
        const template = document.getElementById('list-item-template');
        const fragment = document.createDocumentFragment();

        json.items.forEach(item => {
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
