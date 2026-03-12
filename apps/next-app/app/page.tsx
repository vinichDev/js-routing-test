'use client';

// Формирование главной страницы приложения с пробросом параметров прогона.
import Link from 'next/link';
import {Suspense} from 'react';
import {useSearchParams} from 'next/navigation';

// Формирование внешнего компонента страницы с Suspense boundary.
export default function HomePage() {
    return (
        <Suspense fallback={<main data-test="page-home-loading">Loading home...</main>}>
            <HomePageContent/>
        </Suspense>
    );
}

// Реализация основного содержимого главной страницы.
function HomePageContent() {
    // Извлечение параметров прогона из query string.
    const searchParams = useSearchParams();

    const runId = searchParams.get('run_id');
    const modeId = searchParams.get('mode_id');

    // Формирование query string для ссылки на маршрут списка.
    const listHref = {
        pathname: '/list',
        query: {
            ...(
                runId ? {run_id: runId} : {}
            ),
            ...(
                modeId ? {mode_id: modeId} : {}
            )
        }
    };
    return (
        <main data-test="page-home">
            <h1>Стенд для тестирования технологий маршрутизации</h1>
            <p>Фреймворк: Next.js App Router</p>

            <nav>
                {/* Использование штатного Link для задействования нативных механизмов prefetch. */}
                <Link href={listHref} data-test="link-to-list">
                    Перейти к списку
                </Link>
            </nav>
        </main>
    );
}