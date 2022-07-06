import { EntityDescriptor } from './types';
import * as fs from 'fs';

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

export const updateImportedModuleToModule = (
    sourceDescriptor: EntityDescriptor,
    targetDescriptor: EntityDescriptor,
) => {
    if (!fs.existsSync(sourceDescriptor.absolutePath)) {
        throw new Error(`Source module '${sourceDescriptor.entityName}' does not exist`);
    }

    if (!fs.existsSync(targetDescriptor.absolutePath)) {
        throw new Error(`Target module '${targetDescriptor.entityName}' does not exist`);
    }
};
