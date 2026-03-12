// Инициализация HTTP-сервера коллектора метрик.
import express from 'express';

// Подключение middleware CORS.
import cors from 'cors';

// Подключение файловой подсистемы для журналирования JSONL.
import fs from 'fs';
import path from 'path';

const app = express();

// Инициализация параметров конфигурации коллектора.
const PORT = Number(process.env.PORT || 8090);
const DATA_DIR = process.env.DATA_DIR || '/data';

// Формирование конфигурации политики CORS.
const corsOptions = {
    origin: [
        'http://localhost:3001',
        'http://localhost:3000',
        'http://next-app:3000'
    ],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
};

// Подключение middleware CORS для всех маршрутов.
app.use(cors(corsOptions));

// Обработка preflight-запросов OPTIONS для всех маршрутов.
app.options('*', cors(corsOptions));

// Инициализация парсинга JSON-тел запросов.
app.use(express.json({limit: '2mb'}));

// Инициализация путей журналов.
const RUNS_LOG = path.join(DATA_DIR, 'runs.log');
const METRICS_LOG = path.join(DATA_DIR, 'metrics.log');

// Обеспечение существования директории данных.
fs.mkdirSync(DATA_DIR, {recursive: true});

// Инкапсуляция записи события в журнал в формате JSONL.
function appendJsonLine(file, payload) {
    fs.appendFileSync(file, JSON.stringify(payload) + '\n', 'utf8');
}

// Логирование входящих запросов коллектора.
app.use((req, res, next) => {
    console.log(
        JSON.stringify({
            ts: new Date().toISOString(),
            method: req.method,
            path: req.path,
            origin: req.header('Origin') || ''
        })
    );

    next();
});

// Приём паспорта прогона эксперимента.
app.post('/metrics/run', (req, res) => {
    appendJsonLine(RUNS_LOG, {
        ...req.body,
        _received_at: new Date().toISOString()
    });

    res.json({ok: true});
});

// Приём клиентских событий метрик.
app.post('/metrics/client', (req, res) => {
    appendJsonLine(METRICS_LOG, {
        ...req.body,
        _received_at: new Date().toISOString()
    });

    res.json({ok: true});
});

// Обработка запроса проверки доступности коллектора.
app.get('/health', (req, res) => {
    res.json({ok: true});
});

// Запуск HTTP-сервера коллектора метрик.
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Metrics Collector listening on port ${PORT}, writing to ${DATA_DIR}`);
});