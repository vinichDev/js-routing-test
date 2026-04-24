// Библиотека отправки метрик производительности для Angular 19 SUT.
// Реализует три типа событий: initial_load, route_navigation_spa/direct, list_regeneration.
import { SUT_ID, METRICS_SCHEMA_VERSION, LIST_ITEMS_EXPECTED } from './constants';
import { postJson } from './utils';

export interface InitialLoadParams {
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

export function sendInitialLoadMetricsEvent(params: InitialLoadParams): void {
    const jsResources = params.resourceEntries.filter((e) => e.name.includes('.js'));
    const cssResources = params.resourceEntries.filter((e) => e.name.includes('.css'));

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
        resource_summary: {
            requests_count: params.resourceEntries.length,
            js_requests_count: jsResources.length,
            css_requests_count: cssResources.length,
            total_transfer_size: params.resourceEntries.reduce((s, e) => s + (e.transferSize || 0), 0),
            js_transfer_size: jsResources.reduce((s, e) => s + (e.transferSize || 0), 0),
            css_transfer_size: cssResources.reduce((s, e) => s + (e.transferSize || 0), 0),
        },
    };

    postJson('/metrics/client', payload).catch(console.error);
}

export interface RouteNavigationParams {
    runId: string | null;
    modeId: string;
    iteration: number;
    isDirectLoad: boolean;
    traceId: string;
    version: number;
    navDuration: number;
    tDataReadyMs: number | null;
    itemsCount: number;
}

export function sendRouteNavigationMetrics(params: RouteNavigationParams): void {
    const eventType = params.isDirectLoad ? 'route_navigation_direct' : 'route_navigation_spa';
    const scenarioId = params.isDirectLoad ? 'initial_list_load' : 'nav_home_to_list';
    const tDataReady = params.tDataReadyMs ?? 0;
    const renderAfterData = tDataReady > 0 ? params.navDuration - tDataReady : params.navDuration;

    const payload = {
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
        marks_ms: {
            t0_nav_click: 0,
            t_data_ready: tDataReady,
            t_dom_ready: params.navDuration,
        },
        derived_ms: {
            total: params.navDuration,
            server_and_network: tDataReady || params.navDuration,
            render_after_data: renderAfterData,
        },
        dom_assertions: {
            list_items_expected: LIST_ITEMS_EXPECTED,
            list_items_found: params.itemsCount,
        },
    };

    postJson('/metrics/client', payload).catch(console.error);
}

export interface ListRegenerationParams {
    runId: string | null;
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

export function sendListRegenerationMetrics(params: ListRegenerationParams): void {
    const tDataReadyMs = params.tDataReady - params.t0;
    const tDomReadyMs = params.tDomReady - params.t0;
    const renderAfterDataMs = params.tDomReady - params.tDataReady;

    const payload = {
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

    postJson('/metrics/client', payload).catch(console.error);
}
