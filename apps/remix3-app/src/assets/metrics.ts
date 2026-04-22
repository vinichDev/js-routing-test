// =============================================================================
// Интерфейсы параметров для функций отправки метрик
// =============================================================================

/** Параметры для sendRouteNavigationMetrics */
export interface NavMetricsParams {
    runId: string;
    sutId: string;
    modeId: string;
    iteration: string | number;
    isDirectLoad: boolean;
    traceId: string;
    version: number;
    /** Длительность навигации в мс. Вычисляется в вызывающем компоненте. */
    navDuration: number;
    /** Время от клика до TTFB новой страницы (server+net фаза). null = direct load без t0. */
    tDataReadyMs?: number | null;
    itemsCount: number;
}

/** Параметры для sendListRegenerationMetrics */
export interface RegenMetricsParams {
    runId: string;
    sutId: string;
    modeId: string;
    iteration: string | number;
    traceId: string;
    version: number;
    regenIndex: number;
    t0: number;
    tDataReady: number;
    tDomReady: number;
    itemsCount: number;
}

/** Параметры для sendInitialLoadMetricsEvent */
export interface InitialLoadMetricsParams {
    runId: string | null;
    sutId: string;
    modeId: string;
    iteration: number;
    route: string;
    fcp: number | null;
    lcp: number | null;
    longTaskCount: number;
    longTaskTotal: number;
    longTaskMax: number;
    navigationEntry: PerformanceNavigationTiming | undefined;
    resourceEntries: PerformanceResourceTiming[];
}

// Инкапсуляция отправки JSON-сообщения по относительному URL.
export async function postJson(url: string, payload: unknown): Promise<void> {
    await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        // cache: 'no-store' — не является стандартным полем RequestInit в последних версиях lib.dom
        // keepalive гарантирует отправку даже при уходе со страницы
        keepalive: true,
    });
}

const METRICS_SCHEMA_VERSION = '1.0';
const LIST_ITEMS_EXPECTED = 1000;

export function sendRouteNavigationMetrics(params: NavMetricsParams): Promise<void> {
    const eventType = params.isDirectLoad ? 'route_navigation_direct' : 'route_navigation_spa';
    const scenarioId = params.isDirectLoad ? 'initial_list_load' : 'nav_home_to_list';
    const metricsPayload = {
        schema_version: METRICS_SCHEMA_VERSION,
        event_type: eventType,
        timestamp_utc: new Date().toISOString(),
        run_id: params.runId,
        sut_id: params.sutId,
        mode_id: params.modeId,
        iteration: params.iteration,
        scenario_id: scenarioId,
        route: '/list',
        trace_id: params.traceId,
        version: params.version,
        regen_index: null,
        marks_ms: {
            t0_user_action: 0,
            t_data_ready: params.tDataReadyMs ?? 0,
            t_dom_ready: params.navDuration,
        },
        derived_ms: {
            total: params.navDuration,
            render_after_data: (params.tDataReadyMs ?? 0) > 0
                ? params.navDuration - (params.tDataReadyMs ?? 0)
                : params.navDuration,
        },
        dom_assertions: {
            list_items_expected: LIST_ITEMS_EXPECTED,
            list_items_found: params.itemsCount,
        },
    };

    return postJson('/metrics/client', metricsPayload).catch(console.error);
}

export function sendListRegenerationMetrics(params: RegenMetricsParams): Promise<void> {
    const tDataReadyMs = params.tDataReady - params.t0;
    const tDomReadyMs = params.tDomReady - params.t0;
    const renderAfterDataMs = params.tDomReady - params.tDataReady;

    const metricsPayload = {
        schema_version: METRICS_SCHEMA_VERSION,
        event_type: 'list_regeneration',
        timestamp_utc: new Date().toISOString(),
        run_id: params.runId,
        sut_id: params.sutId,
        mode_id: params.modeId,
        iteration: params.iteration,
        scenario_id: 'list_regen_single',
        route: '/list',
        trace_id: params.traceId,
        version: params.version,
        regen_index: params.regenIndex,
        marks_ms: {
            t0_user_action: 0,
            t_data_ready: tDataReadyMs,
            t_dom_ready: tDomReadyMs,
        },
        derived_ms: {
            total: tDomReadyMs,
            render_after_data: renderAfterDataMs,
        },
        dom_assertions: {
            list_items_expected: LIST_ITEMS_EXPECTED,
            list_items_found: params.itemsCount,
        },
    };

    return postJson('/metrics/client', metricsPayload).catch(console.error);
}

export function sendInitialLoadMetricsEvent(params: InitialLoadMetricsParams): Promise<void> {
    const jsResources = params.resourceEntries.filter((entry: PerformanceResourceTiming) => entry.name.includes('.js'));
    const cssResources = params.resourceEntries.filter((entry: PerformanceResourceTiming) => entry.name.includes('.css'));

    const resourceSummary = {
        requests_count: params.resourceEntries.length,
        js_requests_count: jsResources.length,
        css_requests_count: cssResources.length,
        total_transfer_size: params.resourceEntries.reduce((sum, entry) => sum + (entry.transferSize || 0), 0),
        js_transfer_size: jsResources.reduce((sum, entry) => sum + (entry.transferSize || 0), 0),
        css_transfer_size: cssResources.reduce((sum, entry) => sum + (entry.transferSize || 0), 0),
    };

    const payload = {
        schema_version: METRICS_SCHEMA_VERSION,
        event_type: 'initial_load',
        timestamp_utc: new Date().toISOString(),
        run_id: params.runId,
        sut_id: params.sutId,
        mode_id: params.modeId,
        iteration: params.iteration,
        scenario_id: 'initial_home_load',
        route: params.route,
        web_metrics_ms: {
            ttfb: params.navigationEntry ? params.navigationEntry.responseStart : null,
            dom_content_loaded: params.navigationEntry ? params.navigationEntry.domContentLoadedEventEnd : null,
            load_event_end: params.navigationEntry ? params.navigationEntry.loadEventEnd : null,
            fcp: params.fcp,
            lcp: params.lcp,
            initial_page_ready: performance.now(),
        },
        long_tasks: {
            count: params.longTaskCount,
            total_duration: params.longTaskTotal,
            max_duration: params.longTaskMax,
        },
        resource_summary: resourceSummary,
    };

    return postJson('/metrics/client', payload).catch(console.error);
}
