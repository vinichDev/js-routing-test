'use client';

import { useEffect, useRef, useState } from 'react';
import { SUT_ID } from '../lib/constants';
import { createId } from '../lib/utils';
import type { Item } from '../lib/types';
import { sendRouteNavigationMetrics, sendListRegenerationMetrics } from '../lib/metrics';

interface ListClientProps {
    initialItems: Item[];
    initialVersion: number;
    runId: string;
    modeId: string;
    iteration: number;
    isDirectLoad: boolean;
    loaderTraceId: string;
}

export default function ListClient({
    initialItems,
    initialVersion,
    runId,
    modeId,
    iteration,
    isDirectLoad,
    loaderTraceId,
}: ListClientProps) {
    const [items, setItems] = useState<Item[]>(initialItems);
    const [version, setVersion] = useState<number>(initialVersion);
    const [loading, setLoading] = useState<boolean>(false);
    const [errorText, setErrorText] = useState<string>('');
    const [regenIndex, setRegenIndex] = useState<number>(0);

    const initialMetricsSent = useRef(false);
    const t0Ref = useRef<number>(0);
    // Захватывается при первом рендере компонента — момент, когда данные loader достигли клиента.
    const renderStartRef = useRef(performance.timeOrigin + performance.now());

    // Initial metrics for route_navigation (SSR hydration)
    useEffect(() => {
        if (initialMetricsSent.current || items.length === 0 || modeId === 'warmup') return;
        initialMetricsSent.current = true;

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
            // Server+net фаза: от клика до первого рендера компонента с данными.
            // Для direct load используем TTFB страницы (responseStart относителен timeOrigin).
            const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
            const tDataReadyMs = t0Click !== null
                ? renderStartRef.current - t0Click
                : (navEntry?.responseStart ?? null);
            sessionStorage.removeItem('nav_t0');
            sendRouteNavigationMetrics({
                runId,
                modeId,
                iteration,
                traceId: loaderTraceId,
                version,
                isDirectLoad,
                navDuration,
                tDataReadyMs,
                itemsCount: items.length,
            });
        });
    }, [items, runId, modeId, iteration, isDirectLoad, loaderTraceId, version]);

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

            if (!resp.ok) throw new Error(`Data API responeded with ${resp.status}`);

            const json = await resp.json();
            const tDataReady = performance.now();

            if (!Array.isArray(json.items)) throw new Error("Items is not an array");

            setItems(json.items);
            setVersion(json.version);

            requestAnimationFrame(() => {
                const tDomReady = performance.now();
                
                if (modeId !== 'warmup') {
                    sendListRegenerationMetrics({
                        runId,
                        modeId,
                        iteration,
                        traceId,
                        version: json.version,
                        regenIndex: nextRegenIndex,
                        t0: t0Ref.current,
                        tDataReady,
                        tDomReady,
                        itemsCount: json.items.length,
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
                        const nextRegenIndex = regenIndex + 1;
                        setRegenIndex(nextRegenIndex);
                        loadItems(version + 1, nextRegenIndex);
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
