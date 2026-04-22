// Библиотека отправки метрик производительности для SvelteKit SUT.
// Реализует те же три типа событий, что и остальные SUT:
// initial_load, route_navigation_spa/direct, list_regeneration.

import { METRICS_SCHEMA_VERSION, LIST_ITEMS_EXPECTED } from './constants.js';
import { postJson } from './utils.js';

/**
 * Отправка события начальной загрузки страницы (Web Vitals).
 * Вызывается из InitialLoadMetrics-компонента через PerformanceObserver.
 *
 * @param {object} params
 * @param {string|null} params.runId
 * @param {string} params.sutId
 * @param {string} params.modeId
 * @param {number} params.iteration
 * @param {string} params.route
 * @param {number|null} params.fcp
 * @param {number|null} params.lcp
 * @param {number} params.longTaskCount
 * @param {number} params.longTaskTotal
 * @param {number} params.longTaskMax
 * @param {PerformanceNavigationTiming|undefined} params.navigationEntry
 * @param {PerformanceResourceTiming[]} params.resourceEntries
 */
export function sendInitialLoadMetricsEvent(params) {
    const jsResources = params.resourceEntries.filter((e) => e.name.includes('.js'));
    const cssResources = params.resourceEntries.filter((e) => e.name.includes('.css'));

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

/**
 * Отправка метрики маршрутной навигации (SPA или direct load).
 * navDuration вычисляется в вызывающем коде:
 *   navDuration = (performance.timeOrigin + performance.now()) - parseFloat(sessionStorage.nav_t0)
 *
 * @param {object} params
 * @param {string} params.runId
 * @param {string} params.sutId
 * @param {string} params.modeId
 * @param {number} params.iteration
 * @param {boolean} params.isDirectLoad
 * @param {string} params.traceId
 * @param {number} params.version
 * @param {number} params.navDuration
 * @param {number|null} [params.tDataReadyMs] - Время от клика до начала рендера (server+net).
 * @param {number} params.itemsCount
 */
export function sendRouteNavigationMetrics(params) {
    const eventType = params.isDirectLoad ? 'route_navigation_direct' : 'route_navigation_spa';
    const scenarioId = params.isDirectLoad ? 'initial_list_load' : 'nav_home_to_list';
    const tDataReady = params.tDataReadyMs ?? 0;
    const renderAfterData = tDataReady > 0 ? params.navDuration - tDataReady : params.navDuration;

    const payload = {
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

    postJson('/metrics/client', payload).catch(console.error);
}

/**
 * Отправка метрики регенерации списка.
 * t0, tDataReady, tDomReady — абсолютные значения performance.now().
 *
 * @param {object} params
 * @param {string} params.runId
 * @param {string} params.sutId
 * @param {string} params.modeId
 * @param {number} params.iteration
 * @param {string} params.traceId
 * @param {number} params.version
 * @param {number} params.regenIndex
 * @param {number} params.t0
 * @param {number} params.tDataReady
 * @param {number} params.tDomReady
 * @param {number} params.itemsCount
 */
export function sendListRegenerationMetrics(params) {
    const tDataReadyMs = params.tDataReady - params.t0;
    const tDomReadyMs = params.tDomReady - params.t0;
    const renderAfterDataMs = params.tDomReady - params.tDataReady;

    const payload = {
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

    postJson('/metrics/client', payload).catch(console.error);
}
