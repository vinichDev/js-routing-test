// Сбор метрик первичной загрузки страницы — React Router v7 версия.
// Идентична Remix v2: PerformanceObserver для FCP, LCP, Long Tasks.
import { useEffect, useRef } from 'react';
import { useSearchParams, useLocation } from 'react-router';
import { sendInitialLoadMetricsEvent } from '~/lib/metrics';

export default function InitialLoadMetrics() {
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const sentRef = useRef(false);

    useEffect(() => {
        const runId = searchParams.get('run_id') || null;
        const modeId = searchParams.get('mode_id') || 'manual';
        const iteration = Number(searchParams.get('iteration') || '1');

        if (modeId === 'warmup') return;

        let fcpValue: number | null = null;
        let lcpValue: number | null = null;
        let longTaskCount = 0;
        let longTaskTotal = 0;
        let longTaskMax = 0;

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
            console.error('PerformanceObserver init failed', error);
        }

        const send = () => {
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

        const timeoutId = window.setTimeout(send, 300);

        return () => {
            send();
            window.clearTimeout(timeoutId);
            paintObserver.disconnect();
            lcpObserver.disconnect();
            longTaskObserver.disconnect();
        };
    }, [searchParams, location.pathname]);

    return null;
}
