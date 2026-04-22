// Страница списка TanStack Start — SSR loader через createServerFn + SPA navigation metrics.
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Item } from '~/lib/types'
import { SUT_ID, LIST_ITEMS_EXPECTED, FRAMEWORK_NAME } from '~/lib/constants'
import { createId } from '~/lib/utils'
import { sendRouteNavigationMetrics, sendListRegenerationMetrics } from '~/lib/metrics'

// =============================================================================
// Server Function — выполняется только на сервере, обращается к Data API.
// =============================================================================
const $fetchItems = createServerFn({ method: 'GET' }).handler(async () => {
    const DATA_API_URL = process.env.DATA_API_URL || 'http://data-api:8080'
    const traceId = createId('trace')
    try {
        const resp = await fetch(`${DATA_API_URL}/api/items?version=0`, {
            headers: { 'X-Trace-Id': traceId, 'X-Sut-Id': SUT_ID },
        })
        if (!resp.ok) throw new Error(`Data API status ${resp.status}`)
        const data = await resp.json() as { items: Item[]; version: number }
        return { items: data.items, version: data.version, traceId }
    } catch (e) {
        console.error('$fetchItems failed', e)
        return { items: [] as Item[], version: 0, traceId }
    }
})

// =============================================================================
// Route definition — loader вызывает server function для SSR-фетча данных.
// =============================================================================
export const Route = createFileRoute('/list')({
    validateSearch: (search: Record<string, unknown>) => ({
        run_id: (search.run_id as string) || '',
        mode_id: (search.mode_id as string) || 'manual',
        iteration: Number(search.iteration) || 1,
        sut_id: (search.sut_id as string) || '',
        direct_load: search.direct_load === 'true',
    }),
    loader: async () => $fetchItems(),
    component: ListPage,
})

// =============================================================================
// Компонент страницы списка.
// =============================================================================
function ListPage() {
    const loaderData = Route.useLoaderData()
    const { run_id, mode_id, iteration, direct_load } = Route.useSearch()

    const runId = useMemo(() => run_id || createId('run'), [run_id])
    const modeId = useMemo(() => mode_id || 'manual', [mode_id])
    const iterationNum = useMemo(() => iteration || 1, [iteration])
    const isDirectLoad = direct_load

    const [listState, setListState] = useState({
        items: loaderData.items,
        version: loaderData.version,
    })
    const [loading, setLoading] = useState(false)
    const [errorText, setErrorText] = useState('')
    const [regenIndex, setRegenIndex] = useState(0)

    // Захватываем момент первого рендера компонента (Server+Net фаза)
    const renderStartRef = useRef(performance.timeOrigin + performance.now())
    const initialMetricsSent = useRef(false)

    // Метрики навигации — отправляем после первого рендера с данными.
    useEffect(() => {
        if (initialMetricsSent.current) return
        if (!loaderData.items.length) return
        if (modeId === 'warmup') return
        initialMetricsSent.current = true

        requestAnimationFrame(() => {
            const tNow = performance.now()
            const t0Raw = sessionStorage.getItem('nav_t0')
            const t0Click = t0Raw !== null ? parseFloat(t0Raw) : null
            const navDuration = t0Click !== null
                ? (performance.timeOrigin + tNow) - t0Click
                : tNow
            const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
            const tDataReadyMs = t0Click !== null
                ? renderStartRef.current - t0Click
                : (navEntry?.responseStart ?? null)
            sessionStorage.removeItem('nav_t0')

            sendRouteNavigationMetrics({
                runId,
                modeId,
                iteration: iterationNum,
                isDirectLoad,
                traceId: loaderData.traceId,
                version: loaderData.version,
                navDuration,
                tDataReadyMs,
                itemsCount: loaderData.items.length,
            })
        })
    }, [loaderData, runId, modeId, iterationNum, isDirectLoad])

    async function loadItems(nextVersion: number, nextRegenIndex: number) {
        setLoading(true)
        setErrorText('')
        try {
            const t0 = performance.now()
            const traceId = createId('trace')
            const resp = await fetch(`/api/items?version=${nextVersion}`, {
                headers: { 'X-Trace-Id': traceId, 'X-Run-Id': runId, 'X-Sut-Id': SUT_ID },
                cache: 'no-store',
            })
            if (!resp.ok) throw new Error(`Data API status ${resp.status}`)
            const jsonData = await resp.json() as { items: Item[]; version: number }
            const tDataReady = performance.now()

            setListState({ items: jsonData.items, version: jsonData.version })

            requestAnimationFrame(() => {
                const tDomReady = performance.now()
                if (modeId !== 'warmup') {
                    sendListRegenerationMetrics({
                        runId,
                        modeId,
                        iteration: iterationNum,
                        traceId,
                        version: jsonData.version,
                        regenIndex: nextRegenIndex,
                        t0,
                        tDataReady,
                        tDomReady,
                        itemsCount: jsonData.items.length,
                    })
                }
                setLoading(false)
            })
        } catch (error) {
            console.error('List loading failed', error)
            setErrorText(error instanceof Error ? error.message : 'Unknown error')
            setLoading(false)
        }
    }

    const { items, version } = listState

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
                        const next = regenIndex + 1
                        setRegenIndex(next)
                        loadItems(version + 1, next)
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
    )
}
