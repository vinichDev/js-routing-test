// =============================================================================
// Клиентский скрипт страницы списка для Remix v3 SUT.
// Выполняет загрузку элементов, регенерацию списка и отправку метрик.
// =============================================================================

// Инициализация констант SUT.
const SUT_ID = document.querySelector('[data-test="page-list"]')?.dataset.sutId || 'remix3_app';
const RUN_ID_ATTR = document.querySelector('[data-test="page-list"]')?.dataset.runId || '';
const MODE_ID_ATTR = document.querySelector('[data-test="page-list"]')?.dataset.modeId || 'manual';
const ITERATION_ATTR = Number(document.querySelector('[data-test="page-list"]')?.dataset.iteration || '1');

// Формирование идентификатора на основе времени и случайной компоненты.
function createId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// Формирование run_id с приоритетом переданного от Runner.
const runId = RUN_ID_ATTR || createId('run');
const modeId = MODE_ID_ATTR;
const iteration = ITERATION_ATTR;

const urlParams = new URLSearchParams(window.location.search);
const isDirectLoad = urlParams.get('direct_load') === 'true';

import { sendRouteNavigationMetrics, sendListRegenerationMetrics } from './metrics.js';

// Инициализация загруженных состояний SSR
const container = document.querySelector('[data-test="list-container"]');
const countEl = document.querySelector('[data-test="items-count"]');
const loadingEl = document.querySelector('[data-test="loading-state"]');
const errorEl = document.querySelector('[data-test="error-state"]');
const btn = document.querySelector('[data-test="btn-regenerate"]');

let currentVersion = Number(container?.dataset.version || '0');
let regenIndex = 0;
let t0 = 0;

// =============================================================================
// Отправка метрик начальной SSR-загрузки (сразу при старте скрипта)
// =============================================================================
/**
 * Отправка метрики начальной загрузки страницы списка.
 * Вычисляет navDuration с учётом полных перезагрузок страницы:
 * nav_t0 хранит Date.now() (абсолютное), performance.timeOrigin — начало текущей страницы.
 */
function sendInitialMetrics() {
    if (modeId === 'warmup') return;

    requestAnimationFrame(() => {
        const tNow = performance.now();
        const t0Raw = sessionStorage.getItem('nav_t0');
        const t0Click = t0Raw !== null ? parseFloat(t0Raw) : null;
        const navDuration = t0Click !== null
            ? (performance.timeOrigin + tNow) - t0Click
            : tNow;
        // Для full-page reload: TTFB новой страницы = момент получения данных от сервера.
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
            runId,
            sutId: SUT_ID,
            modeId: modeId,
            iteration,
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
// Реализация клиентской регенерации списка элементов.
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
                'X-Run-Id': runId,
                'X-Sut-Id': SUT_ID,
            },
            cache: 'no-store',
        });

        if (!resp.ok) {
            throw new Error(`Data API responded with status ${resp.status}`);
        }

        const json = await resp.json();
        const tDataReady = performance.now();

        if (!Array.isArray(json.items)) {
            throw new Error("Response field 'items' is not an array");
        }

        currentVersion = json.version;

        // Рендеринг элементов списка
        // Безопасный рендеринг через W3C <template>
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

        // Очистка контейнера и добавление новых узлов
        container.innerHTML = '';
        container.dataset.version = String(json.version);
        container.appendChild(fragment);

        countEl.textContent = `Элементов: ${json.items.length}`;

        requestAnimationFrame(() => {
            const tDomReady = performance.now();

            if (modeId !== 'warmup') {
                sendListRegenerationMetrics({
                    runId,
                    sutId: SUT_ID,
                    modeId: modeId,
                    iteration,
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

// =============================================================================
// Обработка клика кнопки регенерации.
// =============================================================================
btn?.addEventListener('click', () => {
    regenIndex += 1;
    loadItems(currentVersion + 1, regenIndex);
});
