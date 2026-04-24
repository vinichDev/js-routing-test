import { Component, inject } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';

@Component({
    selector: 'app-home',
    standalone: true,
    imports: [RouterLink],
    template: `
        <div data-test="page-home">
            <h2>Home</h2>
            <p>Benchmark SUT: Angular 19 SSR + SPA Navigation</p>
            <a
                [routerLink]="['/list']"
                [queryParams]="currentQueryParams"
                (click)="handleNavClick()"
                data-test="link-to-list"
            >
                Go to List
            </a>
        </div>
    `,
})
export class HomeComponent {
    private route = inject(ActivatedRoute);

    get currentQueryParams() {
        return this.route.snapshot.queryParams;
    }

    handleNavClick(): void {
        // Сохраняем абсолютную временную метку клика для NAV-метрики на странице списка.
        sessionStorage.setItem('nav_t0', String(Date.now()));
    }
}
