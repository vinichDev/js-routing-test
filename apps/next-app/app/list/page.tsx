import { SUT_ID } from '../lib/constants';
import type { Item } from '../lib/types';
import ListClient from './ListClient';
import { createId } from '../lib/utils';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Список элементов',
    description: 'Оптимизированный SSR-список через Server Components',
};

// Server Component для начальной загрузки данных
export default async function ListPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const params = await searchParams;
    const runId = (params.run_id as string) || '';
    const modeId = (params.mode_id as string) || 'manual';
    const iteration = Number(params.iteration || '1');
    const isDirectLoad = params.direct_load === 'true';
    const traceId = createId('trace');

    let initialData = { items: [] as Item[], version: 0 };
    try {
        // Запрос к внутреннему API (со стороны сервера Next.js)
        const dataApiUrl = process.env.DATA_API_URL || 'http://data-api:8080';
        const res = await fetch(`${dataApiUrl}/api/items?version=0`, {
            headers: {
                'X-Trace-Id': traceId,
                'X-Run-Id': runId,
                'X-Sut-Id': SUT_ID,
            },
            cache: 'no-store'
        });
        if (res.ok) {
            initialData = await res.json();
        }
    } catch (e) {
        console.error('Failed to fetch initial items in Server Component', e);
    }

    return (
        <ListClient 
            initialItems={initialData.items} 
            initialVersion={initialData.version} 
            runId={runId} 
            modeId={modeId} 
            iteration={iteration} 
            isDirectLoad={isDirectLoad}
            loaderTraceId={traceId} 
        />
    );
}