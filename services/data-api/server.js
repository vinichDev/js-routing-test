// Инициализация HTTP-сервера сервиса данных.
import express from 'express';

// Подключение middleware CORS.
import cors from 'cors';

// Подключение seed-инициализируемого генератора псевдослучайных чисел.
import seedrandom from 'seedrandom';

const app = express();

// Инициализация параметров конфигурации сервиса.
const ITEMS_COUNT = Number(process.env.ITEMS_COUNT || 1000);
const BASE_SEED = Number(process.env.SEED_BASE || 1337);
const PORT = Number(process.env.PORT || 8080);

// Формирование конфигурации политики CORS.
const corsOptions = {
    origin: [
        'http://localhost:3001',
        'http://localhost:3000',
        'http://next-app:3000'
    ],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-Trace-Id', 'X-Run-Id', 'X-Sut-Id']
};

// Подключение middleware CORS для всех маршрутов.
app.use(cors(corsOptions));

// Обработка preflight-запросов OPTIONS для всех маршрутов.
app.options('*', cors(corsOptions));

// Формирование базового набора элементов фиксированного содержания.
function createBaseItems() {
    return Array.from({length: ITEMS_COUNT},
        (_, index) => (
            {
                id: index,
                title: `Item ${index}`,
                value: (
                           index * 7
                       ) % 100,
                group: index % 10
            }
        )
    );
}

// Выполнение детерминированной перестановки методом Fisher–Yates.
function shuffleDeterministic(items, version) {
    // Инициализация генератора на основе фиксированного seed.
    const rng = seedrandom(String(BASE_SEED + version));

    // Копирование массива для исключения изменения исходных данных.
    const result = [...items];

    // Последовательное перемешивание массива с конца к началу.
    for (let i = result.length - 1; i > 0; i--) {
        // Вычисление индекса элемента для обмена.
        const j = Math.floor(rng() * (
            i + 1
        ));

        // Выполнение обмена элементов.
        [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
}

// Логирование входящих запросов и идентификаторов корреляции.
app.use((req, res, next) => {
    const traceId = req.header('X-Trace-Id') || '';
    const runId = req.header('X-Run-Id') || '';
    const sutId = req.header('X-Sut-Id') || '';

    console.log(
        JSON.stringify({
            ts: new Date().toISOString(),
            method: req.method,
            path: req.path,
            query: req.query,
            origin: req.header('Origin') || '',
            traceId,
            runId,
            sutId
        })
    );

    next();
});

// Обработка запроса на получение списка элементов заданной версии.
app.get('/api/items', (req, res) => {
    // Извлечение версии перестановки из строки запроса.
    const version = Number(req.query.version ?? 0);

    // Формирование исходного набора элементов.
    const baseItems = createBaseItems();

    // Выполнение детерминированной перестановки элементов.
    const items = shuffleDeterministic(baseItems, version);

    // Установка запрета на кэширование ответа.
    res.setHeader('Cache-Control', 'no-store');

    // Проброс идентификатора trace_id в ответ для упрощения отладки.
    const traceId = req.header('X-Trace-Id');
    if (traceId) {
        res.setHeader('X-Trace-Id', traceId);
    }

    // Возврат JSON-ответа клиенту.
    res.json({version, items});
});

// Предоставление метаданных сервиса данных.
app.get('/api/meta', (req, res) => {
    res.json({
        itemsCount: ITEMS_COUNT,
        seedBase: BASE_SEED,
        algorithm: 'Fisher–Yates (Durstenfeld) + seedrandom'
    });
});

// Обработка запроса проверки доступности сервиса.
app.get('/health', (req, res) => {
    res.json({ok: true});
});

// Запуск HTTP-сервера на заданном порту.
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Data API listening on port ${PORT}`);
});