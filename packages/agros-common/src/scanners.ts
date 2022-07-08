import * as fs from 'fs-extra';
import * as path from 'path';
import { normalizeModulesPath } from './normalizers';
import { EntityDescriptor } from './types';
import {
    getCollectionType,
    getEntityDescriptorWithAlias,
    getFileEntityIdentifier,
} from './utils';

export const scanProjectEntities = (startPath = normalizeModulesPath()): EntityDescriptor[] => {
    if (!fs.existsSync(startPath) || !fs.statSync(startPath).isDirectory()) {
        return [];
    }

    let moduleName: string;
    let currentResult: EntityDescriptor[] = [];
    const rawDirEntityNames: string[] = fs.readdirSync(startPath) || [];
    const moduleEntityNames = rawDirEntityNames.filter((rawDirEntityName) => {
        return getCollectionType(rawDirEntityName) === 'module';
    });

    if (moduleEntityNames.length === 1) {
        moduleName = getFileEntityIdentifier(moduleEntityNames[0]);
    } else {
        const moduleEntityName = moduleEntityNames.find((moduleEntityName) => {
            return getFileEntityIdentifier(moduleEntityName) === path.basename(startPath);
        });
        if (moduleEntityName) {
            moduleName = getFileEntityIdentifier(moduleEntityName);
        }
    }

    if (!moduleName && path.relative(normalizeModulesPath(), startPath)) {
        return currentResult;
    }

    for (const rawDirEntityName of rawDirEntityNames) {
        const absolutePath = path.resolve(startPath, rawDirEntityName);
        const entityDescriptor = getEntityDescriptorWithAlias(absolutePath);

        if (fs.statSync(absolutePath).isDirectory()) {
            currentResult = currentResult.concat(scanProjectEntities(path.resolve(startPath, rawDirEntityName)));
            continue;
        }

        if (!entityDescriptor) {
            continue;
        }

        currentResult = currentResult.concat(entityDescriptor);
    }

    return currentResult;
};
