import { h as head, e as escape_html, a as attr, c as ensure_array_like, d as bind_props } from "../../../chunks/root.js";
import { p as page } from "../../../chunks/index.js";
import "@sveltejs/kit/internal";
import "../../../chunks/exports.js";
import "../../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../../chunks/client.js";
import "../../../chunks/constants.js";
function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let searchParams;
    let data = $$props["data"];
    let items = data.items;
    let version = data.version;
    let loading = false;
    searchParams = page.url.searchParams;
    searchParams.get("run_id") || createId("run");
    searchParams.get("mode_id") || "manual";
    Number(searchParams.get("iteration") || "1");
    searchParams.get("direct_load") === "true";
    head("3n1c4l", $$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>Список элементов — SvelteKit</title>`);
      });
    });
    $$renderer2.push(`<main data-test="page-list"><div class="list-controls"><div><h2>Данные</h2> <p class="items-stat" data-test="items-count">Элементов: ${escape_html(items.length)}</p></div> <button class="btn-primary" data-test="btn-regenerate"${attr("disabled", loading, true)}>Сгенерировать новый список</button></div> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[-1-->");
    }
    $$renderer2.push(`<!--]--> <div class="list-container" data-test="list-container"${attr("data-version", version)}><!--[-->`);
    const each_array = ensure_array_like(items);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let item = each_array[$$index];
      $$renderer2.push(`<div class="list-item-card" data-test="list-item"${attr("data-id", item.id)}><div class="item-avatar">${escape_html(item.title.charAt(0))}</div> <div class="item-content"><h3 class="item-title">${escape_html(item.title)}</h3> <p class="item-desc">${escape_html(item.description)}</p> <div class="item-meta"><span class="item-badge">${escape_html(item.group)}</span> <span class="item-value">Value: ${escape_html(item.value)}</span></div></div> <div class="item-actions"><button class="btn-icon" aria-label="Action 1">🔧</button> <button class="btn-icon" aria-label="Action 2">🗑</button></div></div>`);
    }
    $$renderer2.push(`<!--]--></div></main>`);
    bind_props($$props, { data });
  });
}
export {
  _page as default
};
