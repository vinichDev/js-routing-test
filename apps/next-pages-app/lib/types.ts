export interface Item {
    id: string;
    title: string;
    value: number;
    group: string;
    description: string;
}

export interface RunParams {
    runId: string | null;
    modeId: string;
    iteration: number;
}
