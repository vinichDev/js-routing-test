// Главная страница — **Server Component** (без 'use client').
// Next.js App Router: searchParams доступны через props на сервере.
import type { Metadata } from 'next';
import HomeContent from './components/HomeContent';
import { SUT_ID, FRAMEWORK_NAME } from './lib/constants';
import type { RunParams } from './lib/types';

// Next.js Metadata API — мета-теги генерируются на сервере (SEO, document title).
export const metadata: Metadata = {
    title: `Тестовый стенд — ${FRAMEWORK_NAME}`,
    description: `SUT ${SUT_ID}: тестирование производительности маршрутизации`,
};

// Server Component: получает searchParams на сервере без клиентского JS.
export default async function HomePage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    // Извлечение параметров прогона из query string на сервере.
    const params = await searchParams;
    const runParams: RunParams = {
        runId: (params.run_id as string) || null,
        modeId: (params.mode_id as string) || 'manual',
        iteration: Number(params.iteration || '1'),
    };

    // Передача параметров в клиентский компонент через props.
    return <HomeContent runParams={runParams} />;
}