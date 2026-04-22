// Определение корневого layout для App Router — Server Component.
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { FRAMEWORK_NAME } from './lib/constants';
import InitialLoadMetrics from './components/InitialLoadMetrics';

// Next.js Metadata API: глобальные мета-теги для всех страниц.
export const metadata: Metadata = {
    title: {
        default: `Тестовый стенд — ${FRAMEWORK_NAME}`,
        template: `%s — ${FRAMEWORK_NAME}`,
    },
    description: 'Тестовый стенд для сравнения производительности маршрутизации JS-фреймворков',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="ru">
            <head>
                <link rel="stylesheet" href="/shared/global.css" />
            </head>
            <body>
                <div className="layout-container">
                    <header className="app-header">
                        <h1 className="app-title">Тестовый стенд</h1>
                        <div className="framework-badge">{FRAMEWORK_NAME}</div>
                        <div className="routing-tech">Next.js App Router (React Server Components)</div>
                    </header>
                    {children}
                </div>
                <Suspense fallback={null}>
                    <InitialLoadMetrics />
                </Suspense>
            </body>
        </html>
    );
}