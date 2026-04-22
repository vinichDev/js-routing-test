// Сбор метрик первичной загрузки — SolidJS версия.
// onMount — клиентский контекст, window.location доступен без router context.
import { onMount, onCleanup } from 'solid-js'
import { sendInitialLoadMetricsEvent } from '~/lib/metrics'

export default function InitialLoadMetrics() {
    onMount(() => {
        const params = new URLSearchParams(window.location.search)
        const runId = params.get('run_id') || null
        const modeId = params.get('mode_id') || 'manual'
        const iteration = Number(params.get('iteration') || '1')
        const pathname = window.location.pathname

        if (modeId === 'warmup') return

        let fcpValue: number | null = null
        let lcpValue: number | null = null
        let longTaskCount = 0
        let longTaskTotal = 0
        let longTaskMax = 0
        let sent = false

        const paintObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.name === 'first-contentful-paint') fcpValue = entry.startTime
            }
        })

        const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries()
            const last = entries[entries.length - 1]
            if (last) lcpValue = last.startTime
        })

        const longTaskObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                longTaskCount += 1
                longTaskTotal += entry.duration
                longTaskMax = Math.max(longTaskMax, entry.duration)
            }
        })

        try {
            paintObserver.observe({ type: 'paint', buffered: true })
            lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })
            longTaskObserver.observe({ type: 'longtask', buffered: true })
        } catch (_) { /* observer not supported */ }

        const send = () => {
            if (sent) return
            sent = true
            const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
            const resourceEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
            sendInitialLoadMetricsEvent({
                runId,
                modeId,
                iteration,
                route: pathname,
                fcp: fcpValue,
                lcp: lcpValue,
                longTaskCount,
                longTaskTotal,
                longTaskMax,
                navigationEntry,
                resourceEntries,
            })
        }

        const timeoutId = window.setTimeout(send, 300)

        onCleanup(() => {
            send()
            window.clearTimeout(timeoutId)
            paintObserver.disconnect()
            lcpObserver.disconnect()
            longTaskObserver.disconnect()
        })
    })

    return null
}
