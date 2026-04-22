<script>
    // Главная страница SvelteKit SUT.
    // Сохраняет nav_t0 = Date.now() в sessionStorage при клике на ссылку —
    // список прочитает это значение для вычисления длительности навигации.
    import { page } from '$app/state';

    const SUT_ID = 'svelte_app';

    // Формирование query string для ссылки на /list с параметрами прогона.
    $: searchParams = page.url.searchParams;
    $: listHref = (() => {
        const params = new URLSearchParams();
        const runId = searchParams.get('run_id');
        const modeId = searchParams.get('mode_id');
        const iteration = searchParams.get('iteration');
        if (runId) params.set('run_id', runId);
        if (modeId) params.set('mode_id', modeId);
        if (iteration) params.set('iteration', iteration);
        return `/list?${params.toString()}`;
    })();

    /**
     * Фиксация момента клика для вычисления NAV-метрики.
     * Date.now() сохраняется в sessionStorage, чтобы пережить full-page reload.
     * Для SPA-навигации (SvelteKit) sessionStorage сохраняется в рамках вкладки.
     */
    function handleNavClick() {
        sessionStorage.setItem('nav_t0', String(Date.now()));
    }
</script>

<svelte:head>
    <title>Тестовый стенд — SvelteKit</title>
    <meta name="description" content="SUT {SUT_ID}: тестирование маршрутизации" />
</svelte:head>

<main data-test="page-home" class="home-content">
    <h2>Добро пожаловать</h2>
    <p>Тестирование маршрутизации: <strong>{SUT_ID}</strong></p>

    <nav style="margin-top: 2rem;">
        <!-- SvelteKit <a> перехватывает клик и делает SPA-навигацию -->
        <a
            href={listHref}
            data-test="link-to-list"
            class="btn-primary"
            on:click={handleNavClick}
        >
            Перейти к списку
        </a>
    </nav>
</main>
