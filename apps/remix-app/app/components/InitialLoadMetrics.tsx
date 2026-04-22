// Сбор метрик первичной загрузки страницы — Remix v2 версия.
// Использует PerformanceObserver для FCP, LCP, Long Tasks.
import { useEffect, useRef } from 'react';
import { useSearchParams, useLocation } from '@remix-run/react';
import { sendInitialLoadMetricsEvent } from '~/lib/metrics';

export default function InitialLoadMetrics() {
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const sentRef = useRef(false);

    useEffect(() => {
        const runId = searchParams.get('run_id') || null;
        const modeId = searchParams.get('mode_id') || 'manual';
        const iteration = Number(searchParams.get('iteration') || '1');

        // Ограничение сбора initial_load: разрешаем cold и warm, но игнорируем warmup.
        if (modeId === 'warmup') {
            return;
        }

        // Инициализация переменных метрик.
        let fcpValue: number | null = null;
        let lcpValue: number | null = null;
        let longTaskCount = 0;
        let longTaskTotal = 0;
        let longTaskMax = 0;

        // Наблюдение за First Contentful Paint.
        const paintObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.name === 'first-contentful-paint') {
                    fcpValue = entry.startTime;
                }
            }
        });

        // Наблюдение за Largest Contentful Paint.
        const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            if (lastEntry) {
                lcpValue = lastEntry.startTime;
            }
        });

        // Наблюдение за long tasks.
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
        } catch (error) {
            console.error('Performance observer initialization failed', error);
        }

        // Формирование и отправка события initial_load.
        const sendInitialLoadMetrics = () => {
            if (sentRef.current) return;
            sentRef.current = true;

            const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
            const resourceEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

            sendInitialLoadMetricsEvent({
                runId,
                modeId,
                iteration,
                route: location.pathname,
                fcp: fcpValue,
                lcp: lcpValue,
                longTaskCount,
                longTaskTotal,
                longTaskMax,
                navigationEntry,
                resourceEntries,
            });
        };

        // Отложенная отправка initial_load после короткой стабилизации страницы.
        const timeoutId = window.setTimeout(() => {
            sendInitialLoadMetrics();
        }, 300);

        return () => {
            sendInitialLoadMetrics();
            window.clearTimeout(timeoutId);
            paintObserver.disconnect();
            lcpObserver.disconnect();
            longTaskObserver.disconnect();
        };
    }, [searchParams, location.pathname]);

    return null;
}
