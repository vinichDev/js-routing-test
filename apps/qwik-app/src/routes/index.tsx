// Главная страница Qwik SUT.
// Сохраняет nav_t0 = Date.now() в sessionStorage при клике на ссылку.
import { component$ } from '@builder.io/qwik';
import { type DocumentHead, Link, useLocation } from '@builder.io/qwik-city';
import { SUT_ID } from '~/lib/constants';

export default component$(() => {
    const loc = useLocation();
    const sp = loc.url.searchParams;

    const runId = sp.get('run_id') || '';
    const modeId = sp.get('mode_id') || 'manual';
    const iteration = sp.get('iteration') || '1';

    const listParams = new URLSearchParams();
    if (runId) listParams.set('run_id', runId);
    if (modeId) listParams.set('mode_id', modeId);
    if (iteration) listParams.set('iteration', iteration);
    const listHref = `/list?${listParams.toString()}`;

    return (
        <main
            data-test="page-home"
            data-sut-id={SUT_ID}
            data-run-id={runId}
            data-mode-id={modeId}
            data-iteration={iteration}
            class="home-content"
        >
            <h2>Добро пожаловать</h2>
            <p>Тестирование маршрутизации: <strong>{SUT_ID}</strong></p>

            <nav style={{ marginTop: '2rem' }}>
                {/* Qwik <Link> — SPA-навигация через QwikCity router */}
                <Link
                    href={listHref}
                    data-test="link-to-list"
                    class="btn-primary"
                    onClick$={() => {
                        sessionStorage.setItem('nav_t0', String(Date.now()));
                    }}
                >
                    Перейти к списку
                </Link>
            </nav>
        </main>
    );
});

export const head: DocumentHead = {
    title: 'Тестовый стенд — Qwik',
    meta: [{ name: 'description', content: 'SUT qwik_app: тестирование маршрутизации' }],
};
