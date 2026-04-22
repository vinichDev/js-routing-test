import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// Remix v3 API
import { createRequestListener } from 'remix/node-fetch-server';
import { createRouter } from 'remix/fetch-router';
import { route } from 'remix/fetch-router/routes';
import { logger } from 'remix/logger-middleware';

// Конфигурация и обработчики маршрутов.
import { SUT_ID, PORT } from './lib/config.js';
import { homeHandler } from './routes/home.js';
import { listHandler } from './routes/list.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// __dirname указывает на build/. public/ — на уровень выше.
// Клиентские ассеты бандлятся в public/assets/ на этапе build:client.
const publicPath = path.join(__dirname, '..', 'public');

const routes = route({
    home: '/',
    list: '/list',
});

// Middleware для раздачи статических файлов из /public/.
// Клиентские ассеты (entry.js, ListPage.js, chunks/) созданы build:client.
function serveStatic(context: any, next: any) {
    const url = new URL(context.request.url);

    // Обрабатываем только /assets/ — остальное (в т.ч. /shared/) идёт через proxy.
    if (!url.pathname.startsWith('/assets/')) {
        return next();
    }

    // Защита от path traversal атак.
    const relPath = url.pathname.slice('/assets/'.length);
    if (relPath.includes('..')) {
        return new Response('Forbidden', { status: 403 });
    }

    const targetPath = path.join(publicPath, 'assets', relPath);

    if (!fs.existsSync(targetPath)) {
        return next();
    }

    // Определяем Content-Type по расширению файла.
    const ext = path.extname(targetPath);
    const contentTypeMap: Record<string, string> = {
        '.js':  'application/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.map': 'application/json; charset=utf-8',
    };
    const contentType = contentTypeMap[ext] ?? 'text/plain; charset=utf-8';

    const content = fs.readFileSync(targetPath, 'utf8');
    return new Response(content, {
        headers: {
            'Content-Type': contentType,
            'Cache-Control': 'no-store',
        },
    });
}

const router = createRouter({
    middleware: [
        logger(),
        serveStatic,
    ],
});

router.get(routes.home, homeHandler);
router.get(routes.list, listHandler);

// router.fetch — стандартный fetch-обработчик Remix Router.
// cast 'as any': типы Remix 3 alpha не совсем точно отражают подпись FetchHandler
const server = http.createServer(createRequestListener(router.fetch as any));

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Remix v3 SUT (${SUT_ID}) listening on port ${PORT}`);
});
