async function load({ url, fetch }) {
  const runId = url.searchParams.get("run_id") || "";
  const traceId = `trace-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  try {
    const dataApiUrl = process.env.DATA_API_URL || "http://data-api:8080";
    const resp = await fetch(`${dataApiUrl}/api/items?version=0`, {
      headers: {
        "X-Trace-Id": traceId,
        "X-Run-Id": runId,
        "X-Sut-Id": "svelte_app"
      }
    });
    if (!resp.ok) {
      throw new Error(`Data API responded with status ${resp.status}`);
    }
    const data = await resp.json();
    return {
      items: data.items,
      version: data.version,
      loaderTraceId: traceId
    };
  } catch (error) {
    console.error("SvelteKit load: Data API request failed", error);
    return {
      items: [],
      version: 0,
      loaderTraceId: traceId
    };
  }
}
export {
  load
};
