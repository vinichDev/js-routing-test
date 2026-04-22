// Главная страница — Next.js Pages Router.
// getServerSideProps передаёт параметры запуска в пропсы.
import type { GetServerSideProps, NextPage } from 'next';
import Link from 'next/link';
import Head from 'next/head';
import { SUT_ID, FRAMEWORK_NAME } from '@/lib/constants';

interface HomeProps {
    runId: string | null;
    modeId: string;
    iteration: number;
}

export const getServerSideProps: GetServerSideProps<HomeProps> = async ({ query }) => {
    return {
        props: {
            runId: (query['run_id'] as string) || null,
            modeId: (query['mode_id'] as string) || 'manual',
            iteration: Number(query['iteration'] || '1'),
        },
    };
};

const HomePage: NextPage<HomeProps> = ({ runId, modeId, iteration }) => {
    const listQuery = new URLSearchParams();
    if (runId) listQuery.set('run_id', runId);
    listQuery.set('mode_id', modeId);
    listQuery.set('iteration', String(iteration));

    const listHref = `/list?${listQuery.toString()}`;

    return (
        <>
            <Head>
                <title>Тестовый стенд — {FRAMEWORK_NAME}</title>
                <meta name="description" content={`SUT ${SUT_ID}: тестирование маршрутизации`} />
            </Head>
            <main data-test="page-home" className="home-content">
                <h2>Добро пожаловать</h2>
                <p>Тестирование маршрутизации: <strong>{SUT_ID}</strong></p>

                <nav style={{ marginTop: '2rem' }}>
                    {/* Next.js Pages Router <Link> — SPA-навигация через client-side router */}
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
        </>
    );
};

export default HomePage;
