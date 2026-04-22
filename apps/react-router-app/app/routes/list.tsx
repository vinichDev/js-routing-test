// Страница списка React Router v7 — с loader (серверная загрузка данных).
// Рендеринг 1000 элементов через инлайн JSX без React.memo.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useLoaderData } from 'react-router';
import type { LoaderFunctionArgs, MetaFunction } from 'react-router';
import { SUT_ID, FRAMEWORK_NAME, LIST_ITEMS_EXPECTED } from '~/lib/constants';
import { createId } from '~/lib/utils';
import type { Item } from '~/lib/types';
import { sendRouteNavigationMetrics, sendListRegenerationMetrics } from '~/lib/metrics';

export const meta: MetaFunction = () => [
    { title: `Список элементов — ${FRAMEWORK_NAME}` },
    { name: "description", content: `Страница списка из ${LIST_ITEMS_EXPECTED} элементов` },
];

// =============================================================================
// Server Loader — загрузка данных на сервере до отправки HTML браузеру.
// В React Router v7 возвращается plain object (json() deprecated).
// =============================================================================
export async function loader({ request }: LoaderFunctionArgs) {
    const url = new URL(request.url);
    const runId = url.searchParams.get('run_id') || '';
    const traceId = createId('trace');

    try {
        const dataApiUrl = process.env.DATA_API_URL || 'http://data-api:8080';
        const resp = await fetch(`${dataApiUrl}/api/items?version=0`, {
            headers: {
                'X-Trace-Id': traceId,
                'X-Run-Id': runId,
                'X-Sut-Id': SUT_ID,
            },
        });

        if (!resp.ok) throw new Error(`Data API responded with status ${resp.status}`);

        const data = await resp.json() as { items: Item[]; version: number };

        // React Router v7: возвращаем plain object вместо json().
        return {
            items: data.items,
            version: data.version,
            sutId: SUT_ID,
            loaderTraceId: traceId,
        };
    } catch (error) {
        console.error('Loader: Data API request failed', error);
        return {
            items: [] as Item[],
            version: 0,
            sutId: SUT_ID,
            loaderTraceId: traceId,
        };
    }
}

// =============================================================================
// Компонент страницы списка.
// =============================================================================
export default function ListPage() {
    const loaderData = useLoaderData<typeof loader>();

    const [listState, setListState] = useState({ items: loaderData.items, version: loaderData.version });
    const { items, version } = listState;

    const [loading, setLoading] = useState(false);
    const [errorText, setErrorText] = useState('');
    const [regenIndex, setRegenIndex] = useState(0);

    const [searchParams] = useSearchParams();

    const runId = useMemo(() => searchParams.get('run_id') || createId('run'), [searchParams]);
    const modeId = useMemo(() => searchParams.get('mode_id') || 'manual', [searchParams]);
    const iteration = useMemo(() => Number(searchParams.get('iteration') || '1'), [searchParams]);
    const isDirectLoad = useMemo(() => searchParams.get('direct_load') === 'true', [searchParams]);

    const t0Ref = useRef(0);
    const renderStartRef = useRef(performance.timeOrigin + performance.now());
    const initialMetricsSent = useRef(false);

    // Метрики навигации — отправляются после первого рендера с данными из loader.
    useEffect(() => {
        if (initialMetricsSent.current) return;
        if (loaderData.items.length === 0) return;
        if (modeId === 'warmup') return;
        initialMetricsSent.current = true;

        requestAnimationFrame(() => {
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

    async function loadItems(nextVersion: number, nextRegenIndex: number) {
        setLoading(true);
        setErrorText('');

        try {
            t0Ref.current = performance.now();
            const traceId = createId('trace');

            const resp = await fetch(`/api/items?version=${nextVersion}`, {
                headers: {
                    'X-Trace-Id': traceId,
                    'X-Run-Id': runId,
                    'X-Sut-Id': SUT_ID,
                },
                cache: 'no-store',
            });

            if (!resp.ok) throw new Error(`Data API responded with status ${resp.status}`);

            const jsonData = await resp.json() as { items: Item[]; version: number };
            const tDataReady = performance.now();

            if (!Array.isArray(jsonData.items)) throw new Error("Response field 'items' is not an array");

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
                        const next = regenIndex + 1;
                        setRegenIndex(next);
                        loadItems(version + 1, next);
                    }}
                >
                    Сгенерировать новый список
                </button>
            </div>

            {loading && <div className="status-msg status-loading" data-test="loading-state">Загрузка...</div>}
            {errorText && <div className="status-msg status-error" data-test="error-state">Ошибка: {errorText}</div>}

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
