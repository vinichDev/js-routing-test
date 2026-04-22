export interface Item {
    id: string;
    title: string;
    value: number;
    group: string;
    description: string;
}

export interface RunParams {
    runId: string;
    modeId: string;
    iteration: string;
}
