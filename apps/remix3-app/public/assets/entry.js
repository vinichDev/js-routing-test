import {
  run
} from "./chunks/chunk-Q5RMOKWQ.js";

// src/assets/entry.ts
var runtime = run(document, {
  async loadModule(moduleUrl, exportName) {
    const mod = await import(moduleUrl);
    return mod[exportName];
  }
});
runtime.ready().then(() => {
  console.log("[Remix Component] Hydration complete.");
});
