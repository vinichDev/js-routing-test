import {
  clientEntry,
  jsx
} from "./chunks/chunk-Q5RMOKWQ.js";

// src/assets/ListPage.tsx
var SUT_ID = "remix3_app";
function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
function ListPageComponent(handle, initialSetup) {
  let { initialVersion, items, runId, modeId, iteration, isDirectLoad, traceId } = initialSetup;
  let currentVersion = Number(initialVersion);
  let regenIndex = 0;
  let loading = false;
  let errorMsg = null;
  if (modeId !== "warmup") {
    handle.queueTask(() => {
      requestAnimationFrame(() => {
        const tNow = performance.now();
        const t0Raw = sessionStorage.getItem("nav_t0");
        const navDuration = t0Raw !== null ? performance.timeOrigin + tNow - parseFloat(t0Raw) : tNow;
        sessionStorage.removeItem("nav_t0");
        import("./metrics.js").then(({ sendRouteNavigationMetrics }) => {
          sendRouteNavigationMetrics({
            runId,
            sutId: SUT_ID,
            modeId,
            iteration,
            isDirectLoad,
            traceId,
            version: currentVersion,
            navDuration,
            itemsCount: items.length
          });
        });
      });
    });
  }
  async function regenerate() {
    loading = true;
    errorMsg = null;
    regenIndex++;
    handle.update();
    const t0 = performance.now();
    const nextTrace = createId("trace");
    try {
      const resp = await fetch(`/api/items?version=${currentVersion + 1}`, {
        headers: { "X-Trace-Id": nextTrace, "X-Run-Id": runId, "X-Sut-Id": SUT_ID }
      });
      if (!resp.ok)
        throw new Error(`Status ${resp.status}`);
      const json = await resp.json();
      const tDataReady = performance.now();
      currentVersion = json.version;
      items = json.items;
      loading = false;
      handle.queueTask(() => {
        requestAnimationFrame(() => {
          const tDomReady = performance.now();
          if (modeId !== "warmup") {
            import("./metrics.js").then(({ sendListRegenerationMetrics }) => {
              sendListRegenerationMetrics({
                runId,
                sutId: SUT_ID,
                modeId,
                iteration,
                traceId: nextTrace,
                version: currentVersion,
                regenIndex,
                t0,
                tDataReady,
                tDomReady,
                itemsCount: items.length
              });
            });
          }
        });
      });
      handle.update();
    } catch (e) {
      errorMsg = e.message;
      loading = false;
      handle.update();
    }
  }
  return () => /* @__PURE__ */ jsx(
    "main",
    {
      "data-test": "page-list",
      "data-sut-id": SUT_ID,
      "data-run-id": runId,
      "data-mode-id": modeId,
      "data-iteration": iteration,
      children: [
        /* @__PURE__ */ jsx("div", { className: "list-controls", children: [
          /* @__PURE__ */ jsx("div", { children: [
            /* @__PURE__ */ jsx("h2", { children: "\u0414\u0430\u043D\u043D\u044B\u0435" }),
            /* @__PURE__ */ jsx("p", { className: "items-stat", "data-test": "items-count", children: [
              "\u042D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432: ",
              items.length
            ] })
          ] }),
          /* @__PURE__ */ jsx(
            "button",
            {
              className: "btn-primary",
              "data-test": "btn-regenerate",
              disabled: loading,
              on: { click: regenerate },
              children: "\u0421\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043D\u043E\u0432\u044B\u0439 \u0441\u043F\u0438\u0441\u043E\u043A"
            }
          )
        ] }),
        loading && /* @__PURE__ */ jsx("div", { className: "status-msg status-loading", "data-test": "loading-state", children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430..." }),
        errorMsg && /* @__PURE__ */ jsx("div", { className: "status-msg status-error", "data-test": "error-state", children: [
          "\u041E\u0448\u0438\u0431\u043A\u0430: ",
          errorMsg
        ] }),
        /* @__PURE__ */ jsx("div", { className: "list-container", "data-test": "list-container", "data-version": currentVersion, children: items.map((item) => /* @__PURE__ */ jsx("div", { className: "list-item-card", "data-test": "list-item", "data-id": item.id, children: [
          /* @__PURE__ */ jsx("div", { className: "item-avatar", children: item.title.charAt(0) }),
          /* @__PURE__ */ jsx("div", { className: "item-content", children: [
            /* @__PURE__ */ jsx("h3", { className: "item-title", children: item.title }),
            /* @__PURE__ */ jsx("p", { className: "item-desc", children: item.description }),
            /* @__PURE__ */ jsx("div", { className: "item-meta", children: [
              /* @__PURE__ */ jsx("span", { className: "item-badge", children: item.group }),
              /* @__PURE__ */ jsx("span", { className: "item-value", children: [
                "Value: ",
                item.value
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "item-actions", children: [
            /* @__PURE__ */ jsx("button", { className: "btn-icon", children: "\u{1F527}" }),
            /* @__PURE__ */ jsx("button", { className: "btn-icon", children: "\u{1F5D1}" })
          ] })
        ] }, item.id)) })
      ]
    }
  );
}
var ListPage = clientEntry(
  "/assets/ListPage.js#ListPage",
  ListPageComponent
);
export {
  ListPage
};
