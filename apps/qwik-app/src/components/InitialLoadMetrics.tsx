// Сбор метрик первичной загрузки (initial_load) для Qwik SUT.
// Использует useVisibleTask$ с strategy:'document-ready' — запускается в браузере после загрузки документа.
// Читает параметры прогона из data-атрибутов на корневом элементе страницы.
import { component$, useVisibleTask$ } from '@builder.io/qwik';
import { SUT_ID } from '~/lib/constants';
import { sendInitialLoadMetricsEvent } from '~/lib/metrics';

export const InitialLoadMetrics = component$(() => {
    useVisibleTask$(() => {
        const mainEl = (document.querySelector('[data-test="page-home"]') ||
            document.querySelector('[data-test="page-list"]')) as HTMLElement | null;
        if (!mainEl) return;

        const sutId = mainEl.dataset.sutId || SUT_ID;
        const runId = mainEl.dataset.runId || null;
        const modeId = mainEl.dataset.modeId || 'manual';
        const iteration = Number(mainEl.dataset.iteration || '1');

        if (modeId === 'warmup') return;

        // MPA SUT guard: при click-through навигации home→list nav_t0 присутствует
        // в sessionStorage. Пропускаем initial_load — NAV-метрика уже покрывает переход.
        // Для Qwik SPA-навигации list-компонент монтируется впервые → этот компонент
        // (из root layout) не перезапускается, guard срабатывает корректно.
        if (document.querySelector('[data-test="page-list"]') &&
            sessionStorage.getItem('nav_t0') !== null) return;

        let fcpValue: number | null = null;
        let lcpValue: number | null = null;
        let longTaskCount = 0;
        let longTaskTotal = 0;
        let longTaskMax = 0;
        let sent = false;

        try {
            const paintObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.name === 'first-contentful-paint') {
                        fcpValue = entry.startTime;
                    }
                }
            });
            paintObserver.observe({ type: 'paint', buffered: true });
        } catch (e) {
            console.error('Paint observer failed', e);
        }

        try {
            const lcpObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                const lastEntry = entries[entries.length - 1];
                if (lastEntry) lcpValue = lastEntry.startTime;
            });
            lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
        } catch (e) {
            console.error('LCP observer failed', e);
        }

        try {
            const longTaskObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    longTaskCount += 1;
                    longTaskTotal += entry.duration;
                    longTaskMax = Math.max(longTaskMax, entry.duration);
                }
            });
            longTaskObserver.observe({ type: 'longtask', buffered: true });
        } catch (e) {
            console.error('LongTask observer failed', e);
        }

        function sendMetrics() {
            if (sent) return;
            sent = true;
            const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
            const resourceEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
            sendInitialLoadMetricsEvent({
                runId,
                sutId,
                modeId,
                iteration,
                route: window.location.pathname,
                fcp: fcpValue,
                lcp: lcpValue,
                longTaskCount,
                longTaskTotal,
                longTaskMax,
                navigationEntry,
                resourceEntries,
            });
        }

        setTimeout(sendMetrics, 300);
    });

    // Нужен реальный DOM-элемент: intersection-observer не сработает на <></>
    return <span style="position:absolute;top:0;left:0;width:1px;height:1px;pointer-events:none" aria-hidden="true" />;
});
