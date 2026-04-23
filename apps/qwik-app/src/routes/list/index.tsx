// Страница списка Qwik SUT.
// routeLoader$ — SSR-фетч данных на сервере (Qwik resumability: без повторного запуска в браузере).
// useVisibleTask$ — клиентские метрики NAV и REGEN.
import { component$, useSignal, useVisibleTask$, $ } from '@builder.io/qwik';
import { type DocumentHead, routeLoader$, useLocation } from '@builder.io/qwik-city';
import type { Item } from '~/lib/types';
import { SUT_ID, LIST_ITEMS_EXPECTED } from '~/lib/constants';
import { createId } from '~/lib/utils';
import { sendRouteNavigationMetrics, sendListRegenerationMetrics } from '~/lib/metrics';

// =============================================================================
// SSR loader: запускается на сервере при каждом запросе (SPA-nav и direct load).
// Qwik сериализует результат в HTML — браузер "возобновляет" без повторного fetch.
// =============================================================================
export const useListData = routeLoader$(async (requestEv) => {
    const DATA_API_URL = requestEv.env.get('DATA_API_URL') || 'http://data-api:8080';
    const sp = requestEv.url.searchParams;
    const runId = sp.get('run_id') || null;
    const modeId = sp.get('mode_id') || 'manual';
    const iteration = Number(sp.get('iteration') || '1');
    const traceId = createId('trace');

    try {
        const resp = await fetch(`${DATA_API_URL}/api/items?version=0`, {
            headers: { 'X-Trace-Id': traceId, 'X-Sut-Id': SUT_ID },
        });
        if (!resp.ok) throw new Error(`Data API ${resp.status}`);
        const data = await resp.json() as { items: Item[]; version: number };
        return { items: data.items, version: data.version, traceId, runId, modeId, iteration };
    } catch (e) {
        console.error('routeLoader$ failed', e);
        return { items: [] as Item[], version: 0, traceId, runId, modeId, iteration };
    }
});

export default component$(() => {
    const loaderData = useListData();
    const loc = useLocation();

    // Локальные сигналы — обновляются при регенерации
    const regenItems = useSignal<Item[] | null>(null);
    const regenVersion = useSignal<number | null>(null);
    const regenIndex = useSignal(0);
    const loading = useSignal(false);
    const errorText = useSignal('');

    // Производные: regen-данные перекрывают SSR-данные
    const items = () => regenItems.value ?? loaderData.value.items;
    const version = () => regenVersion.value ?? loaderData.value.version;

    // ==========================================================================
    // NAV-метрика: запускается при монтировании компонента в браузере.
    // Для SPA-навигации (QwikCity) — список монтируется впервые в браузере.
    // Для direct load — аналогично (resumability не перезапускает код).
    // ==========================================================================
    useVisibleTask$(() => {
        const data = loaderData.value;
        if (!data?.items?.length) return;
        const modeId = loc.url.searchParams.get('mode_id') || data.modeId;
        if (modeId === 'warmup') return;

        requestAnimationFrame(() => {
            const tNow = performance.now();
            const t0Raw = sessionStorage.getItem('nav_t0');
            const t0Click = t0Raw !== null ? parseFloat(t0Raw) : null;

            const navDuration = t0Click !== null
                ? (performance.timeOrigin + tNow) - t0Click
                : tNow;

            const isDirectLoad = t0Click === null;
            const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
            const tDataReadyMs = t0Click !== null
                ? (performance.timeOrigin + tNow) - t0Click
                : (navEntry?.responseStart ?? null);

            if (t0Click !== null) sessionStorage.removeItem('nav_t0');

            sendRouteNavigationMetrics({
                runId: data.runId,
                modeId: data.modeId,
                iteration: data.iteration,
                isDirectLoad,
                traceId: data.traceId,
                version: data.version,
                navDuration,
                tDataReadyMs,
                itemsCount: data.items.length,
            });
        });
    }, { strategy: 'document-ready' });

    // ==========================================================================
    // Регенерация: клиентский fetch к Data API, затем обновление сигналов.
    // ==========================================================================
    const handleRegen = $(async () => {
        if (loading.value) return;
        loading.value = true;
        errorText.value = '';

        const nextRegenIndex = regenIndex.value + 1;
        regenIndex.value = nextRegenIndex;

        const t0 = performance.now();
        const traceId = createId('trace');
        const nextVersion = version() + 1;
        const data = loaderData.value;

        try {
            const resp = await fetch(`/api/items?version=${nextVersion}`, {
                headers: {
                    'X-Trace-Id': traceId,
                    'X-Run-Id': data.runId || '',
                    'X-Sut-Id': SUT_ID,
                },
                cache: 'no-store',
            });
            if (!resp.ok) throw new Error(`Data API ${resp.status}`);
            const json = await resp.json() as { items: Item[]; version: number };
            const tDataReady = performance.now();

            regenItems.value = json.items;
            regenVersion.value = json.version;

            requestAnimationFrame(() => {
                const tDomReady = performance.now();
                if (data.modeId !== 'warmup') {
                    sendListRegenerationMetrics({
                        runId: data.runId,
                        modeId: data.modeId,
                        iteration: data.iteration,
                        traceId,
                        version: json.version,
                        regenIndex: nextRegenIndex,
                        t0,
                        tDataReady,
                        tDomReady,
                        itemsCount: json.items.length,
                    });
                }
                loading.value = false;
            });
        } catch (e) {
            console.error('Regen failed', e);
            errorText.value = e instanceof Error ? e.message : 'Unknown error';
            loading.value = false;
        }
    });

    return (
        <main
            data-test="page-list"
            data-sut-id={SUT_ID}
            data-run-id={loaderData.value.runId || ''}
            data-mode-id={loaderData.value.modeId}
            data-iteration={String(loaderData.value.iteration)}
        >
            <div class="list-controls">
                <div>
                    <h2>Данные</h2>
                    <p class="items-stat" data-test="items-count">
                        Элементов: {items().length}
                    </p>
                </div>
                <button
                    class="btn-primary"
                    data-test="btn-regenerate"
                    disabled={loading.value}
                    onClick$={handleRegen}
                >
                    Сгенерировать новый список
                </button>
            </div>

            {loading.value && (
                <div class="status-msg status-loading" data-test="loading-state">
                    Загрузка...
                </div>
            )}
            {errorText.value && (
                <div class="status-msg status-error" data-test="error-state">
                    Ошибка: {errorText.value}
                </div>
            )}

            <div class="list-container" data-test="list-container" data-version={String(version())}>
                {items().map((item) => (
                    <div key={item.id} class="list-item-card" data-test="list-item" data-id={item.id}>
                        <div class="item-avatar">{item.title.charAt(0)}</div>
                        <div class="item-content">
                            <h3 class="item-title">{item.title}</h3>
                            <p class="item-desc">{item.description}</p>
                            <div class="item-meta">
                                <span class="item-badge">{item.group}</span>
                                <span class="item-value">Value: {item.value}</span>
                            </div>
                        </div>
                        <div class="item-actions">
                            <button class="btn-icon" aria-label="Action 1">🔧</button>
                            <button class="btn-icon" aria-label="Action 2">🗑</button>
                        </div>
                    </div>
                ))}
            </div>
        </main>
    );
});

export const head: DocumentHead = {
    title: 'Список — Qwik',
};
