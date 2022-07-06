export type UpdateItem = {
    line: number;
    content: string;
    deleteLines: number;
    standalone?: boolean;
} | {
    line: number;
    content: string;
    deleteLines: number;
    standalone: true;
    column: number;
};

export const updateImportedModulesToModule = () => {};
