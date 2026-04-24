// Корневой компонент — только router-outlet + сбор метрик initial_load.
// afterNextRender срабатывает один раз после гидратации (аналог Nuxt default.vue onMounted).
import { Component, afterNextRender, inject, PLATFORM_ID } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { sendInitialLoadMetricsEvent } from './lib/metrics';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterOutlet],
    template: `
        <div class="layout-container">
            <header class="app-header">
                <h1 class="app-title">Тестовый стенд</h1>
                <div class="framework-badge">Angular 19</div>
                <div class="routing-tech">Angular 19 (SSR + SPA Navigation)</div>
            </header>
            <router-outlet />
        </div>
    `,
})
export class AppComponent {
    private router = inject(Router);
    private platformId = inject(PLATFORM_ID);

    constructor() {
        if (!isPlatformBrowser(this.platformId)) return;

        // Срабатывает один раз после первой отрисовки в браузере (после гидратации).
        afterNextRender(() => {
            const url = new URL(window.location.href);
            const modeId = url.searchParams.get('mode_id') || 'manual';
            if (modeId === 'warmup') return;

            // SPA guard: если пришли на /list через SPA-навигацию — nav_t0 уже в sessionStorage.
            // IL-метрика пропускается, NAV-метрика покроет переход.
            if (window.location.pathname === '/list' && sessionStorage.getItem('nav_t0') !== null) return;

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

            setTimeout(() => {
                if (sent) return;
                sent = true;
                paintObserver.disconnect();
                lcpObserver.disconnect();
                longTaskObserver.disconnect();

                const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
                const resourceEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
                const runId = url.searchParams.get('run_id') || null;
                const iteration = parseInt(url.searchParams.get('iteration') || '1', 10);

                sendInitialLoadMetricsEvent({
                    runId,
                    modeId,
                    iteration,
                    route: window.location.pathname,
                    fcp: fcpValue,
                    lcp: lcpValue,
                    longTaskCount,
                    longTaskTotal,
                    longTaskMax,
                    navigationEntry: navEntry,
                    resourceEntries,
                });
            }, 300);
        });
    }
}
