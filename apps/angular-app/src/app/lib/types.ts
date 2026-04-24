export interface Item {
    id: string;
    name: string;
    value: number;
}

export interface ApiResponse {
    items: Item[];
    version: number;
}

export interface ListLoaderData {
    items: Item[];
    version: number;
    traceId: string;
    runId: string;
    modeId: string;
    iteration: number;
}
