'use client';

// Сбор метрик первичной загрузки страницы на стороне браузера.
import {useEffect, useRef} from 'react';
import {useSearchParams} from 'next/navigation';

const SUT_ID = process.env.NEXT_PUBLIC_SUT_ID;

if (!SUT_ID) {
    throw new Error('NEXT_PUBLIC_SUT_ID is not defined');
}

// Инкапсуляция отправки JSON-сообщения по относительному URL.
async function postJson(url: string, payload: unknown) {
    await fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
        cache: 'no-store'
    });
}

export default function InitialLoadMetrics() {
    const searchParams = useSearchParams();

    // Фиксация признака однократной отправки события.
    const sentRef = useRef(false);

    useEffect(() => {
        const runId = searchParams.get('run_id') || null;
        const modeId = searchParams.get('mode_id') || 'A';
        const iteration = Number(searchParams.get('iteration') || '1');

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
            paintObserver.observe({type: 'paint', buffered: true});
            lcpObserver.observe({type: 'largest-contentful-paint', buffered: true});
            longTaskObserver.observe({type: 'longtask', buffered: true});
        } catch (error) {
            console.error('Performance observer initialization failed', error);
        }

        // Формирование и отправка события initial_load.
        const sendInitialLoadMetrics = () => {
            if (sentRef.current) {
                return;
            }

            sentRef.current = true;

            const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
            const resourceEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

            const jsResources = resourceEntries.filter((entry) => entry.name.includes('.js'));
            const cssResources = resourceEntries.filter((entry) => entry.name.includes('.css'));

            const resourceSummary = {
                requests_count: resourceEntries.length,
                js_requests_count: jsResources.length,
                css_requests_count: cssResources.length,
                total_transfer_size: resourceEntries.reduce((sum, entry) => sum + (
                    entry.transferSize || 0
                ), 0),
                js_transfer_size: jsResources.reduce((sum, entry) => sum + (
                    entry.transferSize || 0
                ), 0),
                css_transfer_size: cssResources.reduce((sum, entry) => sum + (
                    entry.transferSize || 0
                ), 0)
            };

            const payload = {
                schema_version: '1.0',
                event_type: 'initial_load',
                timestamp_utc: new Date().toISOString(),
                run_id: runId,
                sut_id: SUT_ID,
                mode_id: modeId,
                iteration,
                scenario_id: 'initial_home_load',
                route: window.location.pathname,
                web_metrics_ms: {
                    ttfb: navigationEntry ? navigationEntry.responseStart : null,
                    dom_content_loaded: navigationEntry ? navigationEntry.domContentLoadedEventEnd : null,
                    load_event_end: navigationEntry ? navigationEntry.loadEventEnd : null,
                    fcp: fcpValue,
                    lcp: lcpValue,
                    initial_page_ready: performance.now()
                },
                long_tasks: {
                    count: longTaskCount,
                    total_duration: longTaskTotal,
                    max_duration: longTaskMax
                },
                resource_summary: resourceSummary
            };

            postJson('/metrics/client', payload).catch((error) => {
                console.error('Initial load metrics sending failed', error);
            });
        };

        // Отложенная отправка initial_load после короткой стабилизации страницы.
        const timeoutId = window.setTimeout(() => {
            sendInitialLoadMetrics();
        }, 700);

        return () => {
            // Попытка отправки initial_load при размонтировании, если таймер не успел сработать.
            sendInitialLoadMetrics();

            window.clearTimeout(timeoutId);
            paintObserver.disconnect();
            lcpObserver.disconnect();
            longTaskObserver.disconnect();
        };
    }, [searchParams]);

    return null;
}