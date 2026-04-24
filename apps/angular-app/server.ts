// Express-сервер для Angular SSR (CommonEngine).
// Обслуживает статические файлы браузерной сборки и SSR-рендеринг через CommonEngine.
import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr/node';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import bootstrap from './src/main.server';

export function app(): express.Express {
    const server = express();
    const serverDistFolder = dirname(fileURLToPath(import.meta.url));
    const browserDistFolder = resolve(serverDistFolder, '../browser');
    const indexHtml = join(serverDistFolder, 'index.server.html');

    const commonEngine = new CommonEngine();

    server.set('view engine', 'html');
    server.set('views', browserDistFolder);

    // Статические файлы из browser-сборки
    server.get('**', express.static(browserDistFolder, {
        maxAge: '1y',
        index: false,
        redirect: false,
    }));

    // SSR для всех маршрутов приложения
    server.get('**', (req, res, next) => {
        const { protocol, originalUrl, baseUrl, headers } = req;
        commonEngine
            .render({
                bootstrap,
                documentFilePath: indexHtml,
                url: `${protocol}://${headers.host}${originalUrl}`,
                publicPath: browserDistFolder,
                providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
            })
            .then((html) => res.send(html))
            .catch((err) => next(err));
    });

    return server;
}

function run(): void {
    const port = process.env['PORT'] || 3000;
    const server = app();
    server.listen(port, () => {
        console.log(`Angular SSR server listening on http://localhost:${port}`);
    });
}

run();
