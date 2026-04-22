import { h as head, a as attr, b as stringify } from "../../chunks/root.js";
import { p as page } from "../../chunks/index.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let searchParams, listHref;
    const SUT_ID = "svelte_app";
    searchParams = page.url.searchParams;
    listHref = (() => {
      const params = new URLSearchParams();
      const runId = searchParams.get("run_id");
      const modeId = searchParams.get("mode_id");
      const iteration = searchParams.get("iteration");
      if (runId) params.set("run_id", runId);
      if (modeId) params.set("mode_id", modeId);
      if (iteration) params.set("iteration", iteration);
      return `/list?${params.toString()}`;
    })();
    head("1uha8ag", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Тестовый стенд — SvelteKit</title>`);
      });
      $$renderer3.push(`<meta name="description"${attr("content", `SUT ${stringify(SUT_ID)}: тестирование маршрутизации`)}/>`);
    });
    $$renderer2.push(`<main data-test="page-home" class="home-content"><h2>Добро пожаловать</h2> <p>Тестирование маршрутизации: <strong>svelte_app</strong></p> <nav style="margin-top: 2rem;"><a${attr("href", listHref)} data-test="link-to-list" class="btn-primary">Перейти к списку</a></nav></main>`);
  });
}
export {
  _page as default
};
