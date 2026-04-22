import { METRICS_SCHEMA_VERSION, SUT_ID, LIST_ITEMS_EXPECTED } from './constants';
import { postJson } from './utils';

export interface RouteNavigationMetricsParams {
    runId: string;
    modeId: string;
    iteration: number;
    traceId: string;
    version: number;
    isDirectLoad?: boolean;
    /** Длительность навигации в мс. Вычисляется в вызывающем компоненте. */
    navDuration: number;
    /** Время от клика до начала рендера компонента (server+net фаза). null = direct load без t0. */
    tDataReadyMs?: number | null;
    itemsCount: number;
}

export function sendRouteNavigationMetrics(params: RouteNavigationMetricsParams): void {
    const eventType = params.isDirectLoad ? 'route_navigation_direct' : 'route_navigation_spa';
    const scenarioId = params.isDirectLoad ? 'initial_list_load' : 'nav_home_to_list';
    const tDataReady = params.tDataReadyMs ?? 0;
    const renderAfterData = tDataReady > 0 ? params.navDuration - tDataReady : params.navDuration;
    const metricsPayload = {
        schema_version: METRICS_SCHEMA_VERSION,
        event_type: eventType,
        timestamp_utc: new Date().toISOString(),
        run_id: params.runId,
        sut_id: SUT_ID,
        mode_id: params.modeId,
        iteration: params.iteration,
        scenario_id: scenarioId,
        route: '/list',
        trace_id: params.traceId,
        version: params.version,
        regen_index: null,
        marks_ms: {
            t0_user_action: 0,
            t_data_ready: tDataReady,
            t_dom_ready: params.navDuration,
        },
        derived_ms: {
            total: params.navDuration,
            render_after_data: renderAfterData,
        },
        dom_assertions: {
            list_items_expected: LIST_ITEMS_EXPECTED,
            list_items_found: params.itemsCount,
        },
    };

    postJson('/metrics/client', metricsPayload).catch(console.error);
}

export interface ListRegenerationMetricsParams {
    runId: string;
    modeId: string;
    iteration: number;
    traceId: string;
    version: number;
    regenIndex: number;
    t0: number;
    tDataReady: number;
    tDomReady: number;
    itemsCount: number;
}

export function sendListRegenerationMetrics(params: ListRegenerationMetricsParams): void {
    const tDataReadyMs = params.tDataReady - params.t0;
    const tDomReadyMs = params.tDomReady - params.t0;
    const renderAfterDataMs = params.tDomReady - params.tDataReady;

    const metricsPayload = {
        schema_version: METRICS_SCHEMA_VERSION,
        event_type: 'list_regeneration',
        timestamp_utc: new Date().toISOString(),
        run_id: params.runId,
        sut_id: SUT_ID,
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

    postJson('/metrics/client', metricsPayload).catch(console.error);
}

export interface InitialLoadMetricsParams {
    runId: string | null;
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

export function sendInitialLoadMetricsEvent(params: InitialLoadMetricsParams): void {
    const jsResources = params.resourceEntries.filter((entry) => entry.name.includes('.js'));
    const cssResources = params.resourceEntries.filter((entry) => entry.name.includes('.css'));

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
        sut_id: SUT_ID,
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

    postJson('/metrics/client', payload).catch(console.error);
}
