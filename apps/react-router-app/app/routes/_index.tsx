// Главная страница React Router v7.
import { Link, useSearchParams } from "react-router";
import type { MetaFunction } from "react-router";
import { SUT_ID, FRAMEWORK_NAME } from "~/lib/constants";

export const meta: MetaFunction = () => [
    { title: `Тестовый стенд — ${FRAMEWORK_NAME}` },
    { name: "description", content: `SUT ${SUT_ID}: тестирование маршрутизации` },
];

export default function HomePage() {
    const [searchParams] = useSearchParams();

    const runId = searchParams.get('run_id');
    const modeId = searchParams.get('mode_id');
    const iteration = searchParams.get('iteration');

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
                {/* React Router v7 <Link> — SPA-навигация через client-side router */}
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
