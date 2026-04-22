<script>
    // Корневой layout SvelteKit — подключает shared CSS и компонент сбора IL-метрик.
    import { onMount } from 'svelte';
    import { page } from '$app/state';
    import { sendInitialLoadMetricsEvent } from '$lib/metrics.js';

    // SUT_ID передаётся через env-переменную в server-hook и через page data.
    // На клиенте используем PUBLIC_SUT_ID из env.
    const SUT_ID = 'svelte_app';

    // Флаг: метрики отправлены для текущей страницы (сбрасывается при навигации).
    let metricsSent = false;

    onMount(() => {
        // Чтение параметров прогона из URL.
        const searchParams = page.url.searchParams;
        const modeId = searchParams.get('mode_id') || 'manual';
        const iteration = Number(searchParams.get('iteration') || '1');
        const runId = searchParams.get('run_id') || null;

        if (modeId === 'warmup' || metricsSent) return;

        // Инициализация наблюдателей Web Vitals.
        /** @type {number | null} */
        let fcpValue = null;
        /** @type {number | null} */
        let lcpValue = null;
        let longTaskCount = 0;
        let longTaskTotal = 0;
        let longTaskMax = 0;

        const paintObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.name === 'first-contentful-paint') {
                    fcpValue = entry.startTime;
                }
            }
        });

        const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const last = entries[entries.length - 1];
            if (last) lcpValue = last.startTime;
        });

        const longTaskObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                longTaskCount += 1;
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

        // Отправка метрик через 300ms после загрузки страницы (для стабилизации LCP).
        const timeoutId = setTimeout(() => {
            if (metricsSent) return;
            metricsSent = true;

            /** @type {PerformanceNavigationTiming | undefined} */
            const navEntry = /** @type {any} */ (performance.getEntriesByType('navigation')[0]);
            /** @type {PerformanceResourceTiming[]} */
            const resourceEntries = /** @type {any} */ (performance.getEntriesByType('resource'));

            sendInitialLoadMetricsEvent({
                runId,
                sutId: SUT_ID,
                modeId,
                iteration,
                route: page.url.pathname,
                fcp: fcpValue,
                lcp: lcpValue,
                longTaskCount,
                longTaskTotal,
                longTaskMax,
                navigationEntry: navEntry,
                resourceEntries,
            });
        }, 300);

        return () => {
            clearTimeout(timeoutId);
            paintObserver.disconnect();
            lcpObserver.disconnect();
            longTaskObserver.disconnect();
        };
    });
</script>

<svelte:head>
    <link rel="stylesheet" href="/shared/global.css" />
</svelte:head>

<div class="layout-container">
    <header class="app-header">
        <h1 class="app-title">Тестовый стенд</h1>
        <div class="framework-badge">SvelteKit</div>
        <div class="routing-tech">SvelteKit (Vite, Server Load + SPA Navigation)</div>
    </header>
    <slot />
</div>
