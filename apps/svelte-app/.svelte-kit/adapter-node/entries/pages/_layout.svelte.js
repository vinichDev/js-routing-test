import { h as head, s as slot } from "../../chunks/root.js";
import "../../chunks/client.js";
import "../../chunks/constants.js";
function _layout($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    head("12qhfyh", $$renderer2, ($$renderer3) => {
      $$renderer3.push(`<link rel="stylesheet" href="/shared/global.css"/>`);
    });
    $$renderer2.push(`<div class="layout-container"><header class="app-header"><h1 class="app-title">Тестовый стенд</h1> <div class="framework-badge">SvelteKit</div> <div class="routing-tech">SvelteKit (Vite, Server Load + SPA Navigation)</div></header> <!--[-->`);
    slot($$renderer2, $$props, "default", {});
    $$renderer2.push(`<!--]--></div>`);
  });
}
export {
  _layout as default
};
