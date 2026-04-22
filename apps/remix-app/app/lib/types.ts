// Общие типы данных для SUT-приложения Remix v2.

// Структура элемента списка, возвращаемого Data API.
export type Item = {
    id: number;
    title: string;
    value: number;
    group: number;
    description: string;
};

// Параметры прогона, передаваемые Runner'ом через query string.
export type RunParams = {
    runId: string | null;
    modeId: string;
    iteration: number;
};
