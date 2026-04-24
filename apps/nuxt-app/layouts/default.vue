<template>
    <div class="layout-container">
        <header class="app-header">
            <h1 class="app-title">Тестовый стенд</h1>
            <div class="framework-badge">Nuxt 3</div>
            <div class="routing-tech">Nuxt 3 (Vue 3, SSR + SPA Navigation)</div>
        </header>
        <slot />
    </div>
</template>

<script setup lang="ts">
// Сбор метрик первичной загрузки (initial_load).
// onMounted срабатывает один раз при гидратации layout — не при SPA-навигации
// (layout персистентен между маршрутами в Nuxt 3).
import { sendInitialLoadMetricsEvent } from '~/lib/metrics';

const route = useRoute();

onMounted(() => {
    const modeId = (route.query.mode_id as string) || 'manual';
    const iteration = Number(route.query.iteration || '1');
    const runId = (route.query.run_id as string) || null;

    if (modeId === 'warmup') return;

    // MPA guard: при click-through SPA-навигации home→list nav_t0 присутствует.
    // Пропускаем initial_load — NAV-метрика уже покрывает переход.
    if (route.path === '/list' && sessionStorage.getItem('nav_t0') !== null) return;

    let fcpValue: number | null = null;
    let lcpValue: number | null = null;
    let longTaskCount = 0;
    let longTaskTotal = 0;
    let longTaskMax = 0;
    let sent = false;

    const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
            if (entry.name === 'first-contentful-paint') fcpValue = entry.startTime;
        }
    });
    const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        if (last) lcpValue = last.startTime;
    });
    const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
            longTaskCount++;
            longTaskTotal += entry.duration;
            longTaskMax = Math.max(longTaskMax, entry.duration);
        }
    });

    try {
        paintObserver.observe({ type: 'paint', buffered: true });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
        longTaskObserver.observe({ type: 'longtask', buffered: true });
    } catch (e) {
        console.error('PerformanceObserver init failed', e);
    }

    const timeoutId = setTimeout(() => {
        if (sent) return;
        sent = true;
        const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
        const resourceEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        sendInitialLoadMetricsEvent({
            runId,
            modeId,
            iteration,
            route: route.path,
            fcp: fcpValue,
            lcp: lcpValue,
            longTaskCount,
            longTaskTotal,
            longTaskMax,
            navigationEntry: navEntry,
            resourceEntries,
        });
    }, 300);

    onUnmounted(() => {
        clearTimeout(timeoutId);
        paintObserver.disconnect();
        lcpObserver.disconnect();
        longTaskObserver.disconnect();
    });
});
</script>
