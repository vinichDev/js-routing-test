// Главная страница Remix v2 — с meta export для SEO.
import { Link, useSearchParams } from "@remix-run/react";
import type { MetaFunction } from "@remix-run/node";
import { SUT_ID, FRAMEWORK_NAME } from "~/lib/constants";

// Remix Meta API — мета-теги для страницы (SSR).
export const meta: MetaFunction = () => {
    return [
        { title: `Тестовый стенд — ${FRAMEWORK_NAME}` },
        { name: "description", content: `SUT ${SUT_ID}: тестирование маршрутизации` },
    ];
};

export default function HomePage() {
    const [searchParams] = useSearchParams();

    // Извлечение параметров прогона из query string.
    const runId = searchParams.get('run_id');
    const modeId = searchParams.get('mode_id');
    const iteration = searchParams.get('iteration');

    // Формирование query string для ссылки на /list.
    const listQuery = new URLSearchParams();
    if (runId) listQuery.set('run_id', runId);
    if (modeId) listQuery.set('mode_id', modeId);
    if (iteration) listQuery.set('iteration', iteration);

    const listHref = `/list?${listQuery.toString()}`;

    return (
        <main data-test="page-home" className="home-content">
            <h2>Добро пожаловать</h2>
            <p>Тестирование маршрутизации: <strong>{SUT_ID}</strong></p>

            <nav style={{ marginTop: '2rem' }}>
                {/* Remix <Link> — клиентская навигация через prefetch */}
                <Link
                    to={listHref}
                    data-test="link-to-list"
                    className="btn-primary"
                    prefetch="intent"
                    onClick={() => sessionStorage.setItem('nav_t0', String(Date.now()))}
                >
                    Перейти к списку
                </Link>
            </nav>
        </main>
    );
}
