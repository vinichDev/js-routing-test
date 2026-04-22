// Сбор метрик первичной загрузки страницы (initial_load).
// Читает параметры прогона из data-атрибутов на корневом элементе страницы.
import { sendInitialLoadMetricsEvent } from './metrics.js';

(function () {
    const mainEl = document.querySelector('[data-test="page-home"]') || document.querySelector('[data-test="page-list"]');
    if (!mainEl) return;

    const sutId = mainEl.dataset.sutId || 'astro_app';
    const runId = mainEl.dataset.runId || null;
    const modeId = mainEl.dataset.modeId || 'manual';
    const iteration = Number(mainEl.dataset.iteration || '1');

    if (modeId === 'warmup') return;

    let fcpValue = null;
    let lcpValue = null;
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

    function sendInitialLoadMetrics() {
        if (sent) return;
        sent = true;

        const navigationEntry = performance.getEntriesByType('navigation')[0];
        const resourceEntries = performance.getEntriesByType('resource');

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

    setTimeout(sendInitialLoadMetrics, 300);
})();

// Захват момента клика на ссылку перехода к списку (для метрики NAV).
document.addEventListener('click', function (e) {
    const target = e.target.closest('[data-test="link-to-list"]');
    if (target) {
        sessionStorage.setItem('nav_t0', String(Date.now()));
    }
});
