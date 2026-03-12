'use client';

// Реализация страницы списка с чтением параметров прогона через Suspense boundary.
import {Suspense, useEffect, useMemo, useRef, useState} from 'react';
import {useSearchParams} from 'next/navigation';

type Item = {
    id: number;
    title: string;
    value: number;
    group: number;
};

// Инициализация публичного идентификатора тестируемого приложения.
const SUT_ID = process.env.NEXT_PUBLIC_SUT_ID || '';

// Проверка обязательной переменной окружения приложения.
if (!SUT_ID) {
    throw new Error('NEXT_PUBLIC_SUT_ID is not defined');
}

// Формирование идентификатора на основе времени и случайной компоненты.
function createId(prefix: string) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// Инкапсуляция отправки JSON-сообщения по относительному URL.
async function postJson(url: string, payload: unknown) {
    await fetch(url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload),
        cache: 'no-store'
    });
}

// Формирование внешнего компонента страницы с Suspense boundary.
export default function ListPage() {
    return (
        <Suspense fallback={<main data-test="page-list-loading">Загрузка страницы списка...</main>}>
            <ListPageContent/>
        </Suspense>
    );
}

// Реализация основного клиентского содержимого страницы списка.
function ListPageContent() {
    const [items, setItems] = useState<Item[]>([]);
    const [version, setVersion] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(false);
    const [errorText, setErrorText] = useState<string>('');

    // Извлечение параметров прогона из query string.
    const searchParams = useSearchParams();

    // Формирование run_id с приоритетом query-параметра от Runner.
    const runId = useMemo(() => {
        return searchParams.get('run_id') || createId('run');
    }, [searchParams]);

    // Извлечение mode_id и iteration из query-параметров.
    const modeId = useMemo(() => {
        return searchParams.get('mode_id') || 'A';
    }, [searchParams]);

    const iteration = useMemo(() => {
        return Number(searchParams.get('iteration') || '1');
    }, [searchParams]);

    // Фиксация времени начала действия.
    const t0Ref = useRef<number>(0);

    // Реализация загрузки списка.
    async function loadItems(nextVersion: number, action: 'initial' | 'regen') {
        setLoading(true);
        setErrorText('');

        try {
            // Фиксация момента начала действия.
            t0Ref.current = performance.now();

            // Формирование trace_id для корреляции запроса и события метрик.
            const traceId = createId('trace');

            console.log('ENV CHECK', {
                SUT_ID,
                apiPath: '/api/items',
                metricsPath: '/metrics/client',
                runId,
                modeId,
                iteration
            });

            // Выполнение запроса к Data API через proxy.
            const resp = await fetch(`/api/items?version=${nextVersion}`, {
                method: 'GET',
                headers: {
                    'X-Trace-Id': traceId,
                    'X-Run-Id': runId,
                    'X-Sut-Id': SUT_ID
                },
                cache: 'no-store'
            });

            // Проверка успешности ответа API.
            if (!resp.ok) {
                throw new Error(`Data API responded with status ${resp.status}`);
            }

            // Извлечение тела ответа и фиксация доступности данных.
            const json = await resp.json();
            const tDataReady = performance.now();

            // Проверка структуры ответа.
            if (!Array.isArray(json.items)) {
                throw new Error('Response field \'items\' is not an array');
            }

            // Обновление состояния страницы.
            setItems(json.items);
            setVersion(json.version);

            // Фиксация готовности DOM после ближайшего кадра отрисовки.
            requestAnimationFrame(() => {
                const tDomReady = performance.now();

                // Формирование события метрик маршрутизации и регенерации.
                const metricsPayload = {
                    schema_version: '1.0',
                    event_type: action === 'initial' ? 'route_navigation' : 'list_regeneration',
                    timestamp_utc: new Date().toISOString(),
                    run_id: runId,
                    sut_id: SUT_ID,
                    mode_id: modeId,
                    iteration,
                    scenario_id: action === 'initial' ? 'nav_home_to_list' : 'list_regen_single',
                    route: '/list',
                    trace_id: traceId,
                    version: json.version,
                    marks_ms: {
                        t0_user_action: 0,
                        t_data_ready: tDataReady - t0Ref.current,
                        t_dom_ready: tDomReady - t0Ref.current
                    },
                    derived_ms: {
                        total: tDomReady - t0Ref.current,
                        render_after_data: tDomReady - tDataReady
                    },
                    dom_assertions: {
                        list_items_expected: 1000,
                        list_items_found: json.items.length
                    }
                };

                // Отправка метрик через proxy без критического влияния на UI.
                postJson('/metrics/client', metricsPayload).catch((metricsError) => {
                    console.error('Metrics sending failed', metricsError);
                });

                setLoading(false);
            });
        } catch (error) {
            console.error('List loading failed', error);
            setErrorText(error instanceof Error ? error.message : 'Unknown error');
            setLoading(false);
        }
    }

    // Выполнение первичной загрузки маршрута /list.
    useEffect(() => {
        loadItems(0, 'initial');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <main data-test="page-list">
            <h1>Список элементов</h1>

            <button
                data-test="btn-regenerate"
                disabled={loading}
                onClick={() => loadItems(version + 1, 'regen')}
            >
                Сгенерировать новый список
            </button>

            <p data-test="items-count">Элементов: {items.length}</p>

            {loading ? <p data-test="loading-state">Загрузка...</p> : null}
            {errorText ? <p data-test="error-state">Ошибка: {errorText}</p> : null}

            <div data-test="list-container" data-version={version}>
                {items.map((item) => (
                    <div key={item.id} data-test="list-item" data-id={item.id}>
                        {item.title} / {item.value} / {item.group}
                    </div>
                ))}
            </div>
        </main>
    );
}