// Инициализация HTTP-сервера коллектора метрик.
import express from 'express';

// Подключение файловой подсистемы для журналирования JSONL.
import fs from 'fs';
import path from 'path';

const app = express();

// Инициализация парсинга JSON-тел запросов.
app.use(express.json({limit: '2mb'}));

// Инициализация параметров конфигурации коллектора.
const PORT = Number(process.env.PORT || 8090);
const DATA_DIR = process.env.DATA_DIR || '/data';

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
            path: req.path
        })
    );
    next();
});

// Приём паспорта прогона эксперимента.
app.post('/metrics/run', (req, res) => {
    const payload = req.body || {};

    const runRecord = {
        schema_version: payload.schema_version || '1.0',
        event_type: 'run_metadata',
        run_id: payload.run_id || null,
        sut_id: payload.sut_id || null,
        mode_id: payload.mode_id || null,
        scenario_set: payload.scenario_set || [],
        iterations: payload.iterations || 1,
        environment: payload.environment || {},
        _received_at: new Date().toISOString()
    };

    appendJsonLine(RUNS_LOG, runRecord);

    res.json({ok: true});
});

// Приём клиентских событий метрик.
app.post('/metrics/client', (req, res) => {
    const payload = req.body || {};

    appendJsonLine(METRICS_LOG, {
        ...payload,
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