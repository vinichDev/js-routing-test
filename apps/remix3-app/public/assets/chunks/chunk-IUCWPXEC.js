// src/assets/metrics.ts
async function postJson(url, payload) {
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    // cache: 'no-store' — не является стандартным полем RequestInit в последних версиях lib.dom
    // keepalive гарантирует отправку даже при уходе со страницы
    keepalive: true
  });
}
var METRICS_SCHEMA_VERSION = "1.0";
var LIST_ITEMS_EXPECTED = 1e3;
function sendRouteNavigationMetrics(params) {
  const eventType = params.isDirectLoad ? "route_navigation_direct" : "route_navigation_spa";
  const scenarioId = params.isDirectLoad ? "initial_list_load" : "nav_home_to_list";
  const metricsPayload = {
    schema_version: METRICS_SCHEMA_VERSION,
    event_type: eventType,
    timestamp_utc: (/* @__PURE__ */ new Date()).toISOString(),
    run_id: params.runId,
    sut_id: params.sutId,
    mode_id: params.modeId,
    iteration: params.iteration,
    scenario_id: scenarioId,
    route: "/list",
    trace_id: params.traceId,
    version: params.version,
    regen_index: null,
    marks_ms: {
      t0_user_action: 0,
      t_data_ready: 0,
      // SSR
      t_dom_ready: params.navDuration
    },
    derived_ms: {
      total: params.navDuration,
      render_after_data: params.navDuration
    },
    dom_assertions: {
      list_items_expected: LIST_ITEMS_EXPECTED,
      list_items_found: params.itemsCount
    }
  };
  return postJson("/metrics/client", metricsPayload).catch(console.error);
}
function sendListRegenerationMetrics(params) {
  const tDataReadyMs = params.tDataReady - params.t0;
  const tDomReadyMs = params.tDomReady - params.t0;
  const renderAfterDataMs = params.tDomReady - params.tDataReady;
  const metricsPayload = {
    schema_version: METRICS_SCHEMA_VERSION,
    event_type: "list_regeneration",
    timestamp_utc: (/* @__PURE__ */ new Date()).toISOString(),
    run_id: params.runId,
    sut_id: params.sutId,
    mode_id: params.modeId,
    iteration: params.iteration,
    scenario_id: "list_regen_single",
    route: "/list",
    trace_id: params.traceId,
    version: params.version,
    regen_index: params.regenIndex,
    marks_ms: {
      t0_user_action: 0,
      t_data_ready: tDataReadyMs,
      t_dom_ready: tDomReadyMs
    },
    derived_ms: {
      total: tDomReadyMs,
      render_after_data: renderAfterDataMs
    },
    dom_assertions: {
      list_items_expected: LIST_ITEMS_EXPECTED,
      list_items_found: params.itemsCount
    }
  };
  return postJson("/metrics/client", metricsPayload).catch(console.error);
}
function sendInitialLoadMetricsEvent(params) {
  const jsResources = params.resourceEntries.filter((entry) => entry.name.includes(".js"));
  const cssResources = params.resourceEntries.filter((entry) => entry.name.includes(".css"));
  const resourceSummary = {
    requests_count: params.resourceEntries.length,
    js_requests_count: jsResources.length,
    css_requests_count: cssResources.length,
    total_transfer_size: params.resourceEntries.reduce((sum, entry) => sum + (entry.transferSize || 0), 0),
    js_transfer_size: jsResources.reduce((sum, entry) => sum + (entry.transferSize || 0), 0),
    css_transfer_size: cssResources.reduce((sum, entry) => sum + (entry.transferSize || 0), 0)
  };
  const payload = {
    schema_version: METRICS_SCHEMA_VERSION,
    event_type: "initial_load",
    timestamp_utc: (/* @__PURE__ */ new Date()).toISOString(),
    run_id: params.runId,
    sut_id: params.sutId,
    mode_id: params.modeId,
    iteration: params.iteration,
    scenario_id: "initial_home_load",
    route: params.route,
    web_metrics_ms: {
      ttfb: params.navigationEntry ? params.navigationEntry.responseStart : null,
      dom_content_loaded: params.navigationEntry ? params.navigationEntry.domContentLoadedEventEnd : null,
      load_event_end: params.navigationEntry ? params.navigationEntry.loadEventEnd : null,
      fcp: params.fcp,
      lcp: params.lcp,
      initial_page_ready: performance.now()
    },
    long_tasks: {
      count: params.longTaskCount,
      total_duration: params.longTaskTotal,
      max_duration: params.longTaskMax
    },
    resource_summary: resourceSummary
  };
  return postJson("/metrics/client", payload).catch(console.error);
}

export {
  postJson,
  sendRouteNavigationMetrics,
  sendListRegenerationMetrics,
  sendInitialLoadMetricsEvent
};
