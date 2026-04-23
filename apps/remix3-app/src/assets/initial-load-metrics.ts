// =============================================================================
// Сбор метрик первичной загрузки страницы для Remix v3 SUT.
// Аналог InitialLoadMetrics.tsx из Next.js / Remix v2, но на vanilla JS.
// Активируется только при mode_id === 'cold'.
// =============================================================================
import { sendInitialLoadMetricsEvent } from './metrics.js';

(function () {
    // Извлечение параметров прогона из data-атрибутов страницы.
    // querySelector возвращает Element | null, но нам нужен HTMLElement (для .dataset).
    const mainEl = (
        document.querySelector('[data-test="page-home"]') ||
        document.querySelector('[data-test="page-list"]')
    ) as HTMLElement | null;
    if (!mainEl) return;

    const sutId = mainEl.dataset.sutId || 'remix3_app';
    const runId = mainEl.dataset.runId || null;
    const modeId = mainEl.dataset.modeId || 'manual';
    const iteration = Number(mainEl.dataset.iteration || '1');

    // Ограничение сбора initial_load: разрешаем cold и warm, но игнорируем warmup.
    if (modeId === 'warmup') return;

    // MPA SUT: при click-through навигации home→list nav_t0 присутствует в sessionStorage.
    // В этом случае пропускаем initial_load — NAV-метрика уже покрывает этот переход.
    // Это предотвращает Cnt:6 (click-through + direct load) вместо корректного Cnt:3.
    if (document.querySelector('[data-test="page-list"]') && sessionStorage.getItem('nav_t0') !== null) return;

    // Инициализация переменных метрик.
    let fcpValue: number | null = null;
    let lcpValue: number | null = null;
    let longTaskCount = 0;
    let longTaskTotal = 0;
    let longTaskMax = 0;
    let sent = false;

    // Функция отправки (инкапсулирована в metrics.js)

    // ==========================================================================
    // Наблюдение за First Contentful Paint.
    // ==========================================================================
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

    // ==========================================================================
    // Наблюдение за Largest Contentful Paint.
    // ==========================================================================
    try {
        const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            if (lastEntry) {
                lcpValue = lastEntry.startTime;
            }
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {
        console.error('LCP observer failed', e);
    }

    // ==========================================================================
    // Наблюдение за long tasks.
    // ==========================================================================
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

    // ==========================================================================
    // Формирование и отправка события initial_load.
    // ==========================================================================
    function sendInitialLoadMetrics() {
        if (sent) return;
        sent = true;

        // getEntriesByType('navigation') возвращает PerformanceEntry[], но реально это PerformanceNavigationTiming
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

    // Отложенная отправка initial_load после короткой стабилизации страницы.
    setTimeout(sendInitialLoadMetrics, 300);
})();

// =============================================================================
// Захват момента клика на ссылку перехода к списку (для метрики NAV).
// Используем Date.now() — абсолютная метка времени, корректно работает
// как при SPA-навигации, так и при полной перезагрузке страницы.
// Event delegation на document гарантирует работу без ожидания DOM-ready.
// =============================================================================
document.addEventListener('click', function (e: MouseEvent) {
    const target = (e.target as Element).closest('[data-test="link-to-list"]');
    if (target) {
        sessionStorage.setItem('nav_t0', String(Date.now()));
    }
});
