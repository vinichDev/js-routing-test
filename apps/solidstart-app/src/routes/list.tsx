// Страница списка SolidStart — cache + createAsync (SSR preload), Signals для REGEN.
// SolidJS не использует VDOM: компонент компилируется в прямые DOM-операции.
import { cache, createAsync, useSearchParams } from '@solidjs/router'
import { createSignal, For, onMount, createEffect } from 'solid-js'
import type { Item } from '~/lib/types'
import { SUT_ID, LIST_ITEMS_EXPECTED } from '~/lib/constants'
import { createId } from '~/lib/utils'
import { sendRouteNavigationMetrics, sendListRegenerationMetrics } from '~/lib/metrics'

// =============================================================================
// Server-side cached function — "use server" помечает код как серверный.
// SolidStart/Vinxi вырезает этот код из клиентского бандла.
// =============================================================================
const getItems = cache(async () => {
    'use server'
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
        console.error('getItems failed', e)
        return { items: [] as Item[], version: 0, traceId: createId('trace') }
    }
}, 'list-items')

// route.preload вызывается при SPA-навигации к /list для параллельной загрузки данных.
export const route = {
    preload: () => getItems(),
}

// =============================================================================
// Компонент страницы списка.
// Использует createAsync для реактивного чтения кэша (SSR → гидратация → клиент).
// =============================================================================
export default function ListPage() {
    const [searchParams] = useSearchParams()
    const loaderData = createAsync(() => getItems())

    const runId = () => searchParams.run_id || createId('run')
    const modeId = () => searchParams.mode_id || 'manual'
    const iteration = () => Number(searchParams.iteration || '1')
    const isDirectLoad = () => searchParams.direct_load === 'true'

    // Захватываем момент инициализации компонента (аналог renderStartRef в React)
    const renderStartTime = performance.timeOrigin + performance.now()

    // Локальные сигналы для состояния регенерации
    const [regenItems, setRegenItems] = createSignal<Item[] | null>(null)
    const [regenVersion, setRegenVersion] = createSignal<number | null>(null)
    const [loading, setLoading] = createSignal(false)
    const [errorText, setErrorText] = createSignal('')
    const [regenIndex, setRegenIndex] = createSignal(0)

    // Производные: regen переопределяет loader data
    const items = () => regenItems() ?? loaderData()?.items ?? []
    const version = () => regenVersion() ?? loaderData()?.version ?? 0

    let metricsSent = false

    // Метрики навигации — onMount выполняется после первого рендера компонента.
    onMount(() => {
        if (modeId() === 'warmup') return
        const currentData = loaderData()
        if (!currentData?.items?.length) return
        if (metricsSent) return
        metricsSent = true

        requestAnimationFrame(() => {
            const tNow = performance.now()
            const t0Raw = typeof sessionStorage !== 'undefined'
                ? sessionStorage.getItem('nav_t0')
                : null
            const t0Click = t0Raw !== null ? parseFloat(t0Raw) : null
            const navDuration = t0Click !== null
                ? (performance.timeOrigin + tNow) - t0Click
                : tNow
            const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
            const tDataReadyMs = t0Click !== null
                ? renderStartTime - t0Click
                : (navEntry?.responseStart ?? null)

            if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('nav_t0')

            sendRouteNavigationMetrics({
                runId: runId(),
                modeId: modeId(),
                iteration: iteration(),
                isDirectLoad: isDirectLoad(),
                traceId: currentData.traceId,
                version: currentData.version,
                navDuration,
                tDataReadyMs,
                itemsCount: currentData.items.length,
            })
        })
    })

    // Если данные появились позже (client-side nav), отправляем метрики после render.
    createEffect(() => {
        const data = loaderData()
        if (!data?.items?.length || metricsSent || modeId() === 'warmup') return
        metricsSent = true

        requestAnimationFrame(() => {
            const tNow = performance.now()
            const t0Raw = typeof sessionStorage !== 'undefined'
                ? sessionStorage.getItem('nav_t0')
                : null
            const t0Click = t0Raw !== null ? parseFloat(t0Raw) : null
            const navDuration = t0Click !== null
                ? (performance.timeOrigin + tNow) - t0Click
                : tNow
            const tDataReadyMs = t0Click !== null ? renderStartTime - t0Click : null
            if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('nav_t0')

            sendRouteNavigationMetrics({
                runId: runId(),
                modeId: modeId(),
                iteration: iteration(),
                isDirectLoad: isDirectLoad(),
                traceId: data.traceId,
                version: data.version,
                navDuration,
                tDataReadyMs,
                itemsCount: data.items.length,
            })
        })
    })

    async function handleRegen() {
        if (loading()) return
        setLoading(true)
        setErrorText('')
        const nextRegenIndex = regenIndex() + 1
        setRegenIndex(nextRegenIndex)

        const t0 = performance.now()
        const traceId = createId('trace')
        const nextVersion = version() + 1

        try {
            const resp = await fetch(`/api/items?version=${nextVersion}`, {
                headers: { 'X-Trace-Id': traceId, 'X-Run-Id': runId(), 'X-Sut-Id': SUT_ID },
                cache: 'no-store',
            })
            if (!resp.ok) throw new Error(`Data API status ${resp.status}`)
            const jsonData = await resp.json() as { items: Item[]; version: number }
            const tDataReady = performance.now()

            // SolidJS реактивно обновляет DOM при изменении сигналов
            setRegenItems(jsonData.items)
            setRegenVersion(jsonData.version)

            requestAnimationFrame(() => {
                const tDomReady = performance.now()
                if (modeId() !== 'warmup') {
                    sendListRegenerationMetrics({
                        runId: runId(),
                        modeId: modeId(),
                        iteration: iteration(),
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
        } catch (e) {
            console.error('Regen failed', e)
            setErrorText(e instanceof Error ? e.message : 'Unknown error')
            setLoading(false)
        }
    }

    return (
        <main data-test="page-list">
            <div class="list-controls">
                <div>
                    <h2>Данные</h2>
                    <p class="items-stat" data-test="items-count">Элементов: {items().length}</p>
                </div>
                <button
                    class="btn-primary"
                    data-test="btn-regenerate"
                    disabled={loading()}
                    onClick={handleRegen}
                >
                    Сгенерировать новый список
                </button>
            </div>

            {loading() && <div class="status-msg status-loading" data-test="loading-state">Загрузка...</div>}
            {errorText() && <div class="status-msg status-error" data-test="error-state">Ошибка: {errorText()}</div>}

            <div class="list-container" data-test="list-container" data-version={version()}>
                {/* SolidJS <For> — оптимальный рендеринг списков без VDOM-diffing */}
                <For each={items()}>
                    {(item) => (
                        <div class="list-item-card" data-test="list-item" data-id={item.id}>
                            <div class="item-avatar">{item.title.charAt(0)}</div>
                            <div class="item-content">
                                <h3 class="item-title">{item.title}</h3>
                                <p class="item-desc">{item.description}</p>
                                <div class="item-meta">
                                    <span class="item-badge">{item.group}</span>
                                    <span class="item-value">Value: {item.value}</span>
                                </div>
                            </div>
                            <div class="item-actions">
                                <button class="btn-icon" aria-label="Action 1">🔧</button>
                                <button class="btn-icon" aria-label="Action 2">🗑</button>
                            </div>
                        </div>
                    )}
                </For>
            </div>
        </main>
    )
}
