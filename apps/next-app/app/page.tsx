'use client';

// Формирование главной страницы приложения с пробросом параметров прогона.
import Link from 'next/link';
import {Suspense} from 'react';
import {useSearchParams} from 'next/navigation';
import InitialLoadMetrics from './components/InitialLoadMetrics';

// Формирование внешнего компонента страницы с Suspense boundary.
export default function HomePage() {
    return (
        <Suspense fallback={<main data-test="page-home-loading">Загрузка главной страницы...</main>}>
            <HomePageContent/>
        </Suspense>
    );
}

// Реализация основного содержимого главной страницы.
function HomePageContent() {
    const searchParams = useSearchParams();

    const runId = searchParams.get('run_id');
    const modeId = searchParams.get('mode_id');
    const iteration = searchParams.get('iteration');

    const listHref = {
        pathname: '/list',
        query: {
            ...(
                runId ? {run_id: runId} : {}
            ),
            ...(
                modeId ? {mode_id: modeId} : {}
            ),
            ...(
                iteration ? {iteration} : {}
            )
        }
    };

    return (
        <main data-test="page-home">
            <InitialLoadMetrics/>

            <h1>Тестовый стенд</h1>
            <p>Фреймворк: Next.js App Router</p>
            <p>SUT: next_app</p>

            <nav>
                <Link href={listHref} data-test="link-to-list">
                    Перейти к списку
                </Link>
            </nav>
        </main>
    );
}