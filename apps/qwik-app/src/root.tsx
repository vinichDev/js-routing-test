import { component$, isDev } from '@builder.io/qwik';
import {
    QwikCityProvider,
    RouterHead,
    RouterOutlet,
    ServiceWorkerRegister,
} from '@builder.io/qwik-city';
import { InitialLoadMetrics } from './components/InitialLoadMetrics';

export default component$(() => {
    return (
        <QwikCityProvider>
            <head>
                <meta charSet="utf-8" />
                <link rel="stylesheet" href="/shared/global.css" />
                <RouterHead />
                {!isDev && <ServiceWorkerRegister />}
            </head>
            <body>
                <div class="layout-container">
                    <header class="app-header">
                        <h1 class="app-title">Тестовый стенд</h1>
                        <div class="framework-badge">Qwik 1.x</div>
                        <div class="routing-tech">QwikCity (Resumability, SPA router)</div>
                    </header>
                    <RouterOutlet />
                </div>
                <InitialLoadMetrics />
            </body>
        </QwikCityProvider>
    );
});
