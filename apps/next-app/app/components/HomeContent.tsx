'use client';

// Клиентский компонент главной страницы.
import Link from 'next/link';
import { SUT_ID, FRAMEWORK_NAME } from '../lib/constants';
import type { RunParams } from '../lib/types';

// Props передаются из Server Component (page.tsx).
interface HomeContentProps {
    runParams: RunParams;
}

export default function HomeContent({ runParams }: HomeContentProps) {
    const { runId, modeId, iteration } = runParams;

    // Формирование query string для ссылки на /list.
    const listHref = {
        pathname: '/list',
        query: {
            ...(runId ? { run_id: runId } : {}),
            ...(modeId ? { mode_id: modeId } : {}),
            ...(typeof iteration === 'number' ? { iteration: String(iteration) } : {}),
        },
    };

    return (
        <main data-test="page-home" className="home-content">

            <h2>Добро пожаловать</h2>
            <p>Тестирование маршрутизации: <strong>{SUT_ID}</strong></p>

            <nav style={{ marginTop: '2rem' }}>
                {/* Next.js <Link> — клиентская навигация без полной перезагрузки */}
                <Link
                    href={listHref}
                    data-test="link-to-list"
                    className="btn-primary"
                    onClick={() => sessionStorage.setItem('nav_t0', String(Date.now()))}
                >
                    Перейти к списку
                </Link>
            </nav>
        </main>
    );
}
