// Сбор метрик первичной загрузки страницы — Next.js Pages Router версия.
// Вместо useSearchParams из next/navigation использует useRouter / window.location.search.
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { sendInitialLoadMetricsEvent } from '@/lib/metrics';

export default function InitialLoadMetrics() {
    const router = useRouter();
    const sentRef = useRef(false);

    useEffect(() => {
        // Параметры из query объекта Pages Router.
        const runId = (router.query['run_id'] as string) || null;
        const modeId = (router.query['mode_id'] as string) || 'manual';
        const iteration = Number(router.query['iteration'] || '1');

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
                route: router.pathname,
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
    // router.query меняется после гидратации — нужно зависеть от него.
    }, [router.query, router.pathname]);

    return null;
}
