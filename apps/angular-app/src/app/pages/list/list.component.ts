// Страница списка: SSR-данные из resolver, SPA-навигация и регенерация списка.
// afterNextRender — Angular-аналог Vue onMounted: запускается после каждой отрисовки компонента.
import { Component, signal, computed, inject, Injector, afterNextRender } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { sendRouteNavigationMetrics, sendListRegenerationMetrics } from '../../lib/metrics';
import { Item, ApiResponse, ListLoaderData } from '../../lib/types';
import { createId } from '../../lib/utils';

@Component({
    selector: 'app-list',
    standalone: true,
    imports: [RouterLink],
    template: `
        <div data-test="page-list">
            <h2>List (v{{ displayVersion() }})</h2>
            <nav>
                <a [routerLink]="['/']" [queryParams]="currentQueryParams">← Home</a>
            </nav>
            <button (click)="handleRegen()" data-test="btn-regenerate">
                Regenerate
            </button>
            <ul>
                @for (item of displayItems(); track item.id) {
                    <li data-test="list-item">{{ item.id }} — {{ item.name }}</li>
                }
            </ul>
        </div>
    `,
})
export class ListComponent {
    private http = inject(HttpClient);
    private route = inject(ActivatedRoute);
    private injector = inject(Injector);

    private loaderData: ListLoaderData = this.route.snapshot.data['listData'];

    regenItems = signal<Item[] | null>(null);
    regenVersion = signal<number | null>(null);
    regenIndex = 0;

    displayItems = computed(() => this.regenItems() ?? this.loaderData.items);
    displayVersion = computed(() => this.regenVersion() ?? this.loaderData.version);

    get currentQueryParams() {
        return this.route.snapshot.queryParams;
    }

    constructor() {
        // Срабатывает после каждой отрисовки компонента:
        //   — при SPA-навигации: после того как resolver завершил fetch и Angular отрисовал DOM
        //   — при прямом заходе: после гидратации SSR-HTML
        afterNextRender(() => {
            const listItems = document.querySelectorAll('[data-test="list-item"]');
            if (!listItems.length) return;

            requestAnimationFrame(() => {
                const nav_t0_str = sessionStorage.getItem('nav_t0');
                const t0Click = nav_t0_str !== null ? parseFloat(nav_t0_str) : null;
                sessionStorage.removeItem('nav_t0');

                const tNow = performance.now();
                const navDuration = t0Click !== null
                    ? (performance.timeOrigin + tNow) - t0Click
                    : tNow;

                // tDataReadyMs: для SPA — время Server+Net (от клика до получения данных).
                // Для прямого захода недоступно — передаём null.
                const tDataReadyMs = t0Click !== null ? null : null;

                sendRouteNavigationMetrics({
                    runId: this.loaderData.runId || null,
                    modeId: this.loaderData.modeId,
                    iteration: this.loaderData.iteration,
                    isDirectLoad: t0Click === null,
                    traceId: this.loaderData.traceId,
                    version: this.loaderData.version,
                    navDuration,
                    tDataReadyMs,
                    itemsCount: listItems.length,
                });
            });
        });
    }

    async handleRegen(): Promise<void> {
        const t0 = performance.now();
        const nextVersion = (this.regenVersion() ?? this.loaderData.version) + 1;
        this.regenIndex++;

        const resp = await firstValueFrom(
            this.http.get<ApiResponse>(`/api/items?version=${nextVersion}`),
        );
        const tDataReady = performance.now();

        const traceId = createId('ang-regen');

        this.regenItems.set(resp.items);
        this.regenVersion.set(resp.version);

        // afterNextRender с injector — вне constructor (Angular 17+).
        afterNextRender(
            () => {
                requestAnimationFrame(() => {
                    const tDomReady = performance.now();
                    const listItems = document.querySelectorAll('[data-test="list-item"]');
                    sendListRegenerationMetrics({
                        runId: this.loaderData.runId || null,
                        modeId: this.loaderData.modeId,
                        iteration: this.loaderData.iteration,
                        traceId,
                        version: resp.version,
                        regenIndex: this.regenIndex,
                        t0,
                        tDataReady,
                        tDomReady,
                        itemsCount: listItems.length,
                    });
                });
            },
            { injector: this.injector },
        );
    }
}
