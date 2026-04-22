import { createRootRoute, HeadContent, Outlet, Scripts, ScrollRestoration } from '@tanstack/react-router'
import InitialLoadMetrics from '~/components/InitialLoadMetrics'

export const Route = createRootRoute({
    head: () => ({
        meta: [
            { charSet: 'utf-8' },
            { name: 'viewport', content: 'width=device-width, initial-scale=1' },
            { title: 'Тестовый стенд — TanStack Start' },
        ],
        links: [
            { rel: 'stylesheet', href: '/shared/global.css' },
        ],
    }),
    component: RootComponent,
})

function RootComponent() {
    return (
        <html lang="ru">
            <head>
                <HeadContent />
            </head>
            <body>
                <div className="layout-container">
                    <header className="app-header">
                        <h1 className="app-title">Тестовый стенд</h1>
                        <div className="framework-badge">TanStack Start v1</div>
                        <div className="routing-tech">TanStack Router (Vite SSR + SPA Navigation)</div>
                    </header>
                    <Outlet />
                </div>
                <ScrollRestoration />
                <Scripts />
                <InitialLoadMetrics />
            </body>
        </html>
    )
}
