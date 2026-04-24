<template>
    <main
        data-test="page-list"
        :data-sut-id="SUT_ID"
        :data-run-id="loaderData?.runId || ''"
        :data-mode-id="loaderData?.modeId || 'manual'"
        :data-iteration="String(loaderData?.iteration || 1)"
    >
        <div class="list-controls">
            <div>
                <h2>Данные</h2>
                <p class="items-stat" data-test="items-count">
                    Элементов: {{ displayItems.length }}
                </p>
            </div>
            <button
                class="btn-primary"
                data-test="btn-regenerate"
                :disabled="loading"
                @click="handleRegen"
            >
                Сгенерировать новый список
            </button>
        </div>

        <div v-if="loading" class="status-msg status-loading" data-test="loading-state">
            Загрузка...
        </div>
        <div v-if="errorText" class="status-msg status-error" data-test="error-state">
            Ошибка: {{ errorText }}
        </div>

        <div class="list-container" data-test="list-container" :data-version="String(displayVersion)">
            <div
                v-for="item in displayItems"
                :key="item.id"
                class="list-item-card"
                data-test="list-item"
                :data-id="item.id"
            >
                <div class="item-avatar">{{ item.title.charAt(0) }}</div>
                <div class="item-content">
                    <h3 class="item-title">{{ item.title }}</h3>
                    <p class="item-desc">{{ item.description }}</p>
                    <div class="item-meta">
                        <span class="item-badge">{{ item.group }}</span>
                        <span class="item-value">Value: {{ item.value }}</span>
                    </div>
                </div>
                <div class="item-actions">
                    <button class="btn-icon" aria-label="Action 1">🔧</button>
                    <button class="btn-icon" aria-label="Action 2">🗑</button>
                </div>
            </div>
        </div>
    </main>
</template>

<script setup lang="ts">
// Страница списка Nuxt 3 SUT.
// useAsyncData — SSR-фетч на сервере (данные сериализуются в HTML payload).
// При SPA-навигации useAsyncData повторно выполняется на клиенте (клиентский fetch).
// onMounted — NAV-метрика (SPA или direct load) и регенерация.
import type { Item, ListLoaderData } from '~/lib/types';
import { SUT_ID } from '~/lib/constants';
import { createId } from '~/lib/utils';
import { sendRouteNavigationMetrics, sendListRegenerationMetrics } from '~/lib/metrics';

definePageMeta({ layout: 'default' });

const route = useRoute();
const config = useRuntimeConfig();

const runId = (route.query.run_id as string) || null;
const modeId = (route.query.mode_id as string) || 'manual';
const iteration = Number(route.query.iteration || '1');
const traceId = createId('trace');

// =============================================================================
// SSR-загрузка данных.
// На сервере: использует внутренний URL data-api (config.dataApiUrl).
// На клиенте (SPA-навигация): использует nginx-прокси (/api/items).
// Ключ включает route.fullPath — уникален для каждой итерации (разные query params),
// что гарантирует свежий fetch при повторных навигациях в рамках одной сессии.
// =============================================================================
const apiBaseUrl = import.meta.server ? config.dataApiUrl : '';
const { data: loaderData } = await useAsyncData<ListLoaderData>(
    route.fullPath,
    async () => {
        const resp = await $fetch<{ items: Item[]; version: number }>(
            `${apiBaseUrl}/api/items?version=0`,
            { headers: { 'X-Trace-Id': traceId, 'X-Sut-Id': SUT_ID } },
        );
        return { items: resp.items, version: resp.version, traceId, runId, modeId, iteration };
    },
);

// Локальное состояние регенерации — перекрывает SSR-данные после REGEN.
const regenItems = ref<Item[] | null>(null);
const regenVersion = ref<number | null>(null);
const regenIndex = ref(0);
const loading = ref(false);
const errorText = ref('');

const displayItems = computed(() => regenItems.value ?? loaderData.value?.items ?? []);
const displayVersion = computed(() => regenVersion.value ?? loaderData.value?.version ?? 0);

// =============================================================================
// NAV-метрика: срабатывает при монтировании компонента в браузере.
// Для SPA-навигации — компонент монтируется когда data fetch завершился
// (useAsyncData с await блокирует рендер через <Suspense> до готовности данных).
// Для direct load — монтируется после гидратации SSR-HTML.
// =============================================================================
onMounted(() => {
    if (modeId === 'warmup') return;

    const listItems = document.querySelectorAll('[data-test="list-item"]');
    if (!listItems.length) return;

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
            runId: loaderData.value?.runId || null,
            modeId: loaderData.value?.modeId || modeId,
            iteration: loaderData.value?.iteration || iteration,
            isDirectLoad,
            traceId: loaderData.value?.traceId || traceId,
            version: loaderData.value?.version || 0,
            navDuration,
            tDataReadyMs,
            itemsCount: listItems.length,
        });
    });
});

// =============================================================================
// Регенерация: клиентский fetch → реактивное обновление → REGEN-метрика.
// =============================================================================
async function handleRegen() {
    if (loading.value) return;
    loading.value = true;
    errorText.value = '';

    const nextRegenIndex = regenIndex.value + 1;
    regenIndex.value = nextRegenIndex;

    const t0 = performance.now();
    const regenTraceId = createId('trace');
    const nextVersion = displayVersion.value + 1;

    try {
        const resp = await $fetch<{ items: Item[]; version: number }>(
            `/api/items?version=${nextVersion}`,
            {
                headers: {
                    'X-Trace-Id': regenTraceId,
                    'X-Run-Id': runId || '',
                    'X-Sut-Id': SUT_ID,
                },
            },
        );
        const tDataReady = performance.now();

        regenItems.value = resp.items;
        regenVersion.value = resp.version;

        // nextTick ждёт обновления виртуального DOM Vue, RAF — браузерной отрисовки.
        await nextTick();
        requestAnimationFrame(() => {
            const tDomReady = performance.now();
            if (modeId !== 'warmup') {
                sendListRegenerationMetrics({
                    runId,
                    modeId,
                    iteration,
                    traceId: regenTraceId,
                    version: resp.version,
                    regenIndex: nextRegenIndex,
                    t0,
                    tDataReady,
                    tDomReady,
                    itemsCount: resp.items.length,
                });
            }
            loading.value = false;
        });
    } catch (e) {
        console.error('Regen failed', e);
        errorText.value = e instanceof Error ? e.message : 'Unknown error';
        loading.value = false;
    }
}
</script>
