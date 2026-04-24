export interface Item {
    id: number;
    title: string;
    description: string;
    value: number;
    group: number;
}

export interface ListLoaderData {
    items: Item[];
    version: number;
    traceId: string;
    runId: string | null;
    modeId: string;
    iteration: number;
}
