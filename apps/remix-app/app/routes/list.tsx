// Страница списка Remix v2 — с loader (серверная загрузка данных) и meta export.
// Рендеринг списка через инлайн JSX (host fibers) — без React.memo/composite fiber overhead.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useLoaderData } from '@remix-run/react';
import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node';
import { json } from '@remix-run/node';
import { SUT_ID, FRAMEWORK_NAME, LIST_ITEMS_EXPECTED } from '~/lib/constants';
import { createId } from '~/lib/utils';
import type { Item } from '~/lib/types';
import { sendRouteNavigationMetrics, sendListRegenerationMetrics } from '~/lib/metrics';

// =============================================================================
// Remix Meta API — мета-теги для страницы списка (SSR).
// =============================================================================
export const meta: MetaFunction = () => {
    return [
        { title: `Список элементов — ${FRAMEWORK_NAME}` },
        { name: "description", content: `Страница списка из ${LIST_ITEMS_EXPECTED} элементов` },
    ];
};

// =============================================================================
// Remix Loader — серверная загрузка данных при первоначальном запросе.
// Загружает данные ДО отправки HTML в браузер (SSR optimization).
// =============================================================================
export async function loader({ request }: LoaderFunctionArgs) {
    // Извлечение параметров прогона из URL запроса.
    const url = new URL(request.url);
    const runId = url.searchParams.get('run_id') || '';
    const traceId = `trace-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    try {
        // Серверный запрос к Data API — данные загружаются на сервере, а не в браузере.
        // Это ключевое преимущество Remix: данные встраиваются в HTML-ответ.
        const dataApiUrl = process.env.DATA_API_URL || 'http://data-api:8080';
        const resp = await fetch(`${dataApiUrl}/api/items?version=0`, {
            method: 'GET',
            headers: {
                'X-Trace-Id': traceId,
                'X-Run-Id': runId,
                'X-Sut-Id': SUT_ID,
            },
        });

        if (!resp.ok) {
            throw new Error(`Data API responded with status ${resp.status}`);
        }

        const data = await resp.json();

        // Remix `json()` сериализует данные и встраивает в HTML для гидратации.
        return json({
            items: data.items as Item[],
            version: data.version as number,
            sutId: SUT_ID,
            loaderTraceId: traceId,
        });
    } catch (error) {
        console.error('Loader: Data API request failed', error);
        // Fallback: вернуть пустой массив, клиент загрузит данные повторно.
        return json({
            items: [] as Item[],
            version: 0,
            sutId: SUT_ID,
            loaderTraceId: traceId,
        });
    }
}

// =============================================================================
// Компонент страницы списка — Client Component (нужен useState для регенерации).
// =============================================================================
export default function ListPage() {
    // Remix useLoaderData — данные, загруженные на сервере через loader.
    const loaderData = useLoaderData<typeof loader>();

    const [listState, setListState] = useState<{ items: Item[]; version: number }>({
        items: loaderData.items,
        version: loaderData.version,
    });
    const { items, version } = listState;

    const [loading, setLoading] = useState<boolean>(false);
    const [errorText, setErrorText] = useState<string>('');
    const [regenIndex, setRegenIndex] = useState<number>(0);

    // Извлечение параметров прогона из query string.
    const [searchParams] = useSearchParams();

    // Формирование run_id с приоритетом query-параметра от Runner.
    const runId = useMemo(() => {
        return searchParams.get('run_id') || createId('run');
    }, [searchParams]);

    // Извлечение mode_id и iteration из query-параметров.
    const modeId = useMemo(() => {
        return searchParams.get('mode_id') || 'manual';
    }, [searchParams]);

    const iteration = useMemo(() => {
        return Number(searchParams.get('iteration') || '1');
    }, [searchParams]);

    const isDirectLoad = useMemo(() => {
        return searchParams.get('direct_load') === 'true';
    }, [searchParams]);

    // Фиксация времени начала действия.
    const t0Ref = useRef<number>(0);
    const renderStartRef = useRef(performance.timeOrigin + performance.now());

    // Отправка метрик initial route_navigation после гидратации данных из loader.
    const initialMetricsSent = useRef(false);

    useEffect(() => {
        if (initialMetricsSent.current) return;
        if (loaderData.items.length === 0) return;
        if (modeId === 'warmup') return;
        initialMetricsSent.current = true;

        // Фиксация готовности DOM после рендеринга серверных данных.
        requestAnimationFrame(() => {
            // Вычисление длительности навигации.
            // nav_t0 содержит Date.now() момента клика (абсолютная метка).
            // performance.timeOrigin — абсолютное время старта текущей страницы.
            // Для direct load nav_t0 пуст → используем performance.now() от начала загрузки.
            const tNow = performance.now();
            const t0Raw = sessionStorage.getItem('nav_t0');
            const t0Click = t0Raw !== null ? parseFloat(t0Raw) : null;
            const navDuration = t0Click !== null
                ? (performance.timeOrigin + tNow) - t0Click
                : tNow;
            const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
            const tDataReadyMs = t0Click !== null
                ? renderStartRef.current - t0Click
                : (navEntry?.responseStart ?? null);
            sessionStorage.removeItem('nav_t0');
            sendRouteNavigationMetrics({
                runId,
                modeId,
                iteration,
                isDirectLoad,
                traceId: loaderData.loaderTraceId,
                version: loaderData.version,
                navDuration,
                tDataReadyMs,
                itemsCount: loaderData.items.length,
            });
        });
    }, [loaderData, runId, modeId, iteration, isDirectLoad]);

    // Реализация загрузки списка при регенерации (клиентская сторона).
    async function loadItems(
        nextVersion: number,
        nextRegenIndex: number
    ) {
        setLoading(true);
        setErrorText('');

        try {
            // Фиксация момента начала действия.
            t0Ref.current = performance.now();

            // Формирование trace_id для корреляции запроса и события метрик.
            const traceId = createId('trace');

            // Клиентский запрос к Data API через proxy (регенерация).
            const resp = await fetch(`/api/items?version=${nextVersion}`, {
                method: 'GET',
                headers: {
                    'X-Trace-Id': traceId,
                    'X-Run-Id': runId,
                    'X-Sut-Id': SUT_ID,
                },
                cache: 'no-store',
            });

            // Проверка успешности ответа API.
            if (!resp.ok) {
                throw new Error(`Data API responded with status ${resp.status}`);
            }

            // Извлечение тела ответа и фиксация доступности данных.
            const jsonData = await resp.json();
            const tDataReady = performance.now();

            // Проверка структуры ответа.
            if (!Array.isArray(jsonData.items)) {
                throw new Error("Response field 'items' is not an array");
            }

            // =================================================================
            // Фиксация времени DOM Ready через requestAnimationFrame.
            // RAF срабатывает в момент отрисовки следующего браузерного кадра —
            // это момент ПОСЛЕ того как React зафиксировал DOM и браузер начал отрисовку.
            // =================================================================

            // Обновляем items — основной дорогостоящий рендер.
            setListState({ items: jsonData.items, version: jsonData.version });

            requestAnimationFrame(() => {
                const tDomReady = performance.now();
                if (modeId !== 'warmup') {
                    sendListRegenerationMetrics({
                        runId,
                        modeId,
                        iteration,
                        traceId,
                        version: jsonData.version,
                        regenIndex: nextRegenIndex,
                        t0: t0Ref.current,
                        tDataReady,
                        tDomReady,
                        itemsCount: jsonData.items.length,
                    });
                }
                // Убираем индикатор загрузки ПОСЛЕ фиксации метрики,
                // чтобы не провоцировать лишний render-цикл до RAF.
                setLoading(false);
            });
        } catch (error) {
            console.error('List loading failed', error);
            setErrorText(error instanceof Error ? error.message : 'Unknown error');
            setLoading(false);
        }
    }

    return (
        <main data-test="page-list">
            <div className="list-controls">
                <div>
                    <h2>Данные</h2>
                    <p className="items-stat" data-test="items-count">Элементов: {items.length}</p>
                </div>
                <button
                    className="btn-primary"
                    data-test="btn-regenerate"
                    disabled={loading}
                    onClick={() => {
                        const nextRegenIndex = regenIndex + 1;
                        setRegenIndex(nextRegenIndex);
                        loadItems(version + 1, nextRegenIndex);
                    }}
                >
                    Сгенерировать новый список
                </button>
            </div>

            {loading ? <div className="status-msg status-loading" data-test="loading-state">Загрузка...</div> : null}
            {errorText ? <div className="status-msg status-error" data-test="error-state">Ошибка: {errorText}</div> : null}

            {/* Инлайн JSX (host fibers) — без React.memo и composite fiber overhead.
                Это намеренное решение для измерения baseline-производительности React reconciliation.
                React.memo с кастомным компаратором давал ~1155ms на 1000 shuffle-элементах,
                тогда как инлайн JSX (next-app подход) даёт ~47ms. */}
            <div className="list-container" data-test="list-container" data-version={version}>
                {items.map((item) => (
                    <div key={item.id} className="list-item-card" data-test="list-item" data-id={item.id}>
                        <div className="item-avatar">{item.title.charAt(0)}</div>
                        <div className="item-content">
                            <h3 className="item-title">{item.title}</h3>
                            <p className="item-desc">{item.description}</p>
                            <div className="item-meta">
                                <span className="item-badge">{item.group}</span>
                                <span className="item-value">Value: {item.value}</span>
                            </div>
                        </div>
                        <div className="item-actions">
                            <button className="btn-icon" aria-label="Action 1">🔧</button>
                            <button className="btn-icon" aria-label="Action 2">🗑</button>
                        </div>
                    </div>
                ))}
            </div>
        </main>
    );
}

