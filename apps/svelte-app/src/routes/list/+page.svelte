<script>
    // Страница списка SvelteKit SUT.
    // Использует данные из server load (SSR), клиентскую регенерацию и метрики.
    import { onMount, tick } from 'svelte';
    import { page } from '$app/state';
    import { afterNavigate } from '$app/navigation';
    import { createId } from '$lib/utils.js';
    import { sendRouteNavigationMetrics, sendListRegenerationMetrics } from '$lib/metrics.js';

    const SUT_ID = 'svelte_app';

    // Захватывается при создании компонента — момент когда SvelteKit передал данные в компонент.
    const renderStart = performance.timeOrigin + performance.now();

    // Данные из server load — SSR-гидратация.
    /** @type {{ items: any[], version: number, loaderTraceId: string }} */
    export let data;

    // Реактивное состояние списка — обновляется при регенерации.
    let items = data.items;
    let version = data.version;
    let loading = false;
    let errorText = '';
    let regenIndex = 0;

    // Параметры прогона из URL.
    $: searchParams = page.url.searchParams;
    $: runId = searchParams.get('run_id') || createId('run');
    $: modeId = searchParams.get('mode_id') || 'manual';
    $: iteration = Number(searchParams.get('iteration') || '1');
    $: isDirectLoad = searchParams.get('direct_load') === 'true';

    // ==========================================================================
    // Метрики NAV (маршрутная навигация).
    // afterNavigate срабатывает после завершения SPA-навигации SvelteKit.
    // Для direct load nav_t0 отсутствует → используем performance.now() от начала страницы.
    // ==========================================================================
    afterNavigate(() => {
        if (modeId === 'warmup') return;
        if (items.length === 0) return;

        // afterNavigate срабатывает после рендеринга компонента — DOM уже обновлён.
        // requestAnimationFrame гарантирует замер после браузерной отрисовки.
        requestAnimationFrame(() => {
            const tNow = performance.now();
            const t0Raw = sessionStorage.getItem('nav_t0');
            const t0Click = t0Raw !== null ? parseFloat(t0Raw) : null;
            const navDuration = t0Click !== null
                ? (performance.timeOrigin + tNow) - t0Click
                : tNow;
            /** @type {PerformanceNavigationTiming|undefined} */
            const navEntry = /** @type {any} */ (performance.getEntriesByType('navigation')[0]);
            const tDataReadyMs = t0Click !== null
                ? renderStart - t0Click
                : (navEntry?.responseStart ?? null);
            sessionStorage.removeItem('nav_t0');

            sendRouteNavigationMetrics({
                runId,
                sutId: SUT_ID,
                modeId,
                iteration,
                isDirectLoad,
                traceId: data.loaderTraceId,
                version: data.version,
                navDuration,
                tDataReadyMs,
                itemsCount: items.length,
            });
        });
    });

    // ==========================================================================
    // Регенерация списка — клиентский fetch к Data API.
    // Svelte реактивное присваивание (items = newItems) синхронно обновляет DOM
    // без Virtual DOM — Svelte компилирует реактивные блоки в direct DOM calls.
    // ==========================================================================
    /**
     * @param {number} nextVersion
     * @param {number} nextRegenIndex
     */
    async function loadItems(nextVersion, nextRegenIndex) {
        loading = true;
        errorText = '';

        const t0 = performance.now();
        const traceId = createId('trace');

        try {
            const resp = await fetch(`/api/items?version=${nextVersion}`, {
                headers: {
                    'X-Trace-Id': traceId,
                    'X-Run-Id': runId,
                    'X-Sut-Id': SUT_ID,
                },
                cache: 'no-store',
            });

            if (!resp.ok) throw new Error(`Data API responded with status ${resp.status}`);

            const json = await resp.json();
            const tDataReady = performance.now();

            if (!Array.isArray(json.items)) throw new Error("Response field 'items' is not an array");

            // Svelte реактивное присваивание — немедленно запускает компиляторно-сгенерированные
            // DOM-операции. Не использует Virtual DOM, reconciliation или setState-батчинг.
            items = json.items;
            version = json.version;

            // await tick() ожидает завершения всех pending Svelte-обновлений DOM.
            // После tick() DOM гарантированно содержит новые элементы.
            await tick();

            // RAF фиксирует момент ПОСЛЕ браузерной отрисовки обновлённого DOM.
            requestAnimationFrame(() => {
                const tDomReady = performance.now();
                loading = false;

                if (modeId !== 'warmup') {
                    sendListRegenerationMetrics({
                        runId,
                        sutId: SUT_ID,
                        modeId,
                        iteration,
                        traceId,
                        version: json.version,
                        regenIndex: nextRegenIndex,
                        t0,
                        tDataReady,
                        tDomReady,
                        itemsCount: json.items.length,
                    });
                }
            });
        } catch (error) {
            console.error('List loading failed', error);
            errorText = error instanceof Error ? error.message : 'Unknown error';
            loading = false;
        }
    }
</script>

<svelte:head>
    <title>Список элементов — SvelteKit</title>
</svelte:head>

<main data-test="page-list">
    <div class="list-controls">
        <div>
            <h2>Данные</h2>
            <p class="items-stat" data-test="items-count">Элементов: {items.length}</p>
        </div>
        <button
            class="btn-primary"
            data-test="btn-regenerate"
            disabled={loading}
            on:click={() => {
                regenIndex += 1;
                loadItems(version + 1, regenIndex);
            }}
        >
            Сгенерировать новый список
        </button>
    </div>

    {#if loading}
        <div class="status-msg status-loading" data-test="loading-state">Загрузка...</div>
    {/if}

    {#if errorText}
        <div class="status-msg status-error" data-test="error-state">Ошибка: {errorText}</div>
    {/if}

    <!-- Список рендерится через Svelte {#each} — compile-time DOM-операции, без VDOM -->
    <div class="list-container" data-test="list-container" data-version={version}>
        {#each items as item (item.id)}
            <div class="list-item-card" data-test="list-item" data-id={item.id}>
                <div class="item-avatar">{item.title.charAt(0)}</div>
                <div class="item-content">
                    <h3 class="item-title">{item.title}</h3>
                    <p class="item-desc">{item.description}</p>
                    <div class="item-meta">
                        <span class="item-badge">{item.group}</span>
                        <span class="item-value">Value: {item.value}</span>
                    </div>
                </div>
                <div class="item-actions">
                    <button class="btn-icon" aria-label="Action 1">🔧</button>
                    <button class="btn-icon" aria-label="Action 2">🗑</button>
                </div>
            </div>
        {/each}
    </div>
</main>
