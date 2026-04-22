// =============================================================================
// Точка входа HTTP-сервера Vanilla SUT-приложения.
// Написан на чистом встроенном 'node:http' без использования сторонних библиотек.
// =============================================================================
import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// Конфигурация и обработчики маршрутов.
import { SUT_ID, PORT } from './lib/config.js';
import { homeHandler } from './routes/home.js';
import { listHandler } from './routes/list.js';

// Инициализация __dirname для ESM.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Путь к директории статических файлов клиентских скриптов.
const assetsPath = path.join(__dirname, 'assets');
const sharedPath = path.join(__dirname, '..', '..', 'shared');

// =============================================================================
// Отдача статических файлов.
// =============================================================================
function serveStatic(req, res, prefix, rootDir) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const filename = url.pathname.slice(prefix.length);
    
    // Защита от path traversal
    if (filename.includes('..')) {
        res.writeHead(403);
        res.end('Forbidden');
        return true;
    }

    const filePath = path.join(rootDir, filename);

    if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath);
        let contentType = 'text/plain';
        if (ext === '.js') contentType = 'application/javascript; charset=utf-8';
        if (ext === '.css') contentType = 'text/css; charset=utf-8';

        res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'no-store'
        });
        res.end(fs.readFileSync(filePath));
        return true;
    }
    return false;
}

// =============================================================================
// Создание сервера с простейшим роутингом
// =============================================================================
const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    
    // Логирование (observability)
    console.log(`${req.method} ${url.pathname}`);

    // Отдача статики
    if (url.pathname.startsWith('/assets/')) {
        if (serveStatic(req, res, '/assets/', assetsPath)) return;
    }
    if (url.pathname.startsWith('/shared/')) {
        if (serveStatic(req, res, '/shared/', sharedPath)) return;
    }

    // Обработчики маршрутов
    try {
        if (url.pathname === '/') {
            return await homeHandler(req, res);
        } else if (url.pathname === '/list') {
            return await listHandler(req, res);
        }

        // Если не найдено
        res.writeHead(404);
        res.end('Not found');
    } catch (e) {
        console.error('Unhandled Server Error', e);
        res.writeHead(500);
        res.end('Internal Server Error');
    }
});

// =============================================================================
// Запуск HTTP-сервера на заданном порту.
// =============================================================================
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Vanilla SUT (${SUT_ID}) listening on port ${PORT}`);
});
