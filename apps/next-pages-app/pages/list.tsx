// Страница списка — Next.js Pages Router.
// Данные загружаются на сервере через getServerSideProps; регенерация — клиентским fetch.
import type { GetServerSideProps, NextPage } from 'next';
import Head from 'next/head';
import { useState, useRef, useEffect } from 'react';
import { SUT_ID, FRAMEWORK_NAME, LIST_ITEMS_EXPECTED } from '@/lib/constants';
import { createId } from '@/lib/utils';
import type { Item } from '@/lib/types';
import { sendRouteNavigationMetrics, sendListRegenerationMetrics } from '@/lib/metrics';

interface ListProps {
    items: Item[];
    version: number;
    runId: string | null;
    modeId: string;
    iteration: number;
    isDirectLoad: boolean;
    loaderTraceId: string;
}

// =============================================================================
// Server-side — загрузка данных до отправки HTML браузеру.
// =============================================================================
export const getServerSideProps: GetServerSideProps<ListProps> = async ({ query, req }) => {
    const runId = (query['run_id'] as string) || null;
    const modeId = (query['mode_id'] as string) || 'manual';
    const iteration = Number(query['iteration'] || '1');
    const isDirectLoad = query['direct_load'] === 'true';
    const traceId = createId('trace');

    try {
        const dataApiUrl = process.env.DATA_API_URL || 'http://data-api:8080';
        const resp = await fetch(`${dataApiUrl}/api/items?version=0`, {
            headers: {
                'X-Trace-Id': traceId,
                'X-Run-Id': runId || '',
                'X-Sut-Id': SUT_ID,
            },
        });

        if (!resp.ok) throw new Error(`Data API responded with status ${resp.status}`);

        const data = await resp.json() as { items: Item[]; version: number };

        return {
            props: {
                items: data.items,
                version: data.version,
                runId,
                modeId,
                iteration,
                isDirectLoad,
                loaderTraceId: traceId,
            },
        };
    } catch (error) {
        console.error('getServerSideProps: Data API request failed', error);
        return {
            props: {
                items: [],
                version: 0,
                runId,
                modeId,
                iteration,
                isDirectLoad,
                loaderTraceId: traceId,
            },
        };
    }
};

// =============================================================================
// Компонент страницы списка.
// =============================================================================
const ListPage: NextPage<ListProps> = ({ items: initialItems, version: initialVersion, runId, modeId, iteration, isDirectLoad, loaderTraceId }) => {
    const [items, setItems] = useState<Item[]>(initialItems);
    const [version, setVersion] = useState(initialVersion);
    const [loading, setLoading] = useState(false);
    const [errorText, setErrorText] = useState('');
    const [regenIndex, setRegenIndex] = useState(0);

    const t0Ref = useRef(0);
    const renderStartRef = useRef(performance.timeOrigin + performance.now());
    const initialMetricsSent = useRef(false);

    // Метрики навигации — отправляются после монтирования компонента.
    useEffect(() => {
        if (initialMetricsSent.current) return;
        if (initialItems.length === 0) return;
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
                traceId: loaderTraceId,
                version: initialVersion,
                navDuration,
                tDataReadyMs,
                itemsCount: initialItems.length,
            });
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /** Клиентская загрузка нового набора данных (регенерация). */
    async function loadItems(nextVersion: number, nextRegenIndex: number) {
        setLoading(true);
        setErrorText('');

        try {
            t0Ref.current = performance.now();
            const traceId = createId('trace');

            const resp = await fetch(`/api/items?version=${nextVersion}`, {
                headers: {
                    'X-Trace-Id': traceId,
                    'X-Run-Id': runId || '',
                    'X-Sut-Id': SUT_ID,
                },
                cache: 'no-store',
            });

            if (!resp.ok) throw new Error(`Data API responded with status ${resp.status}`);

            const jsonData = await resp.json() as { items: Item[]; version: number };
            const tDataReady = performance.now();

            if (!Array.isArray(jsonData.items)) throw new Error("Response field 'items' is not an array");

            setItems(jsonData.items);
            setVersion(jsonData.version);

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
        <>
            <Head>
                <title>Список элементов — {FRAMEWORK_NAME}</title>
                <meta name="description" content={`Страница списка из ${LIST_ITEMS_EXPECTED} элементов`} />
            </Head>
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
        </>
    );
};

export default ListPage;
