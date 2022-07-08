import {
    statSync,
    existsSync,
    readdirSync,
} from 'fs';
import {
    EntityDescriptor,
    PathDescriptor,
} from './types';
import {
    normalizeAlias,
    normalizeModulesPath,
    normalizeNoExtensionPath,
    normalizeRelativePath,
} from './normalizers';
import {
    CollectionType,
    ProjectConfigParser,
} from '@agros/config';
import * as path from 'path';
import {
    transformAliasedPathToPath,
    transformPathToAliasedPath,
} from './transformers';

const projectConfigParser = new ProjectConfigParser();

export const getPathDescriptorWithAlias = (pathname: string): PathDescriptor => {
    const absolutePath = transformAliasedPathToPath(pathname);

    if (!existsSync(absolutePath)) {
        return null;
    }

    const statResult = statSync(absolutePath);

    return {
        absolutePath,
        relativePath: normalizeRelativePath(absolutePath),
        aliasPath: transformPathToAliasedPath(absolutePath),
        filename: path.basename(absolutePath),
        isBlockDevice: statResult.isBlockDevice.bind(statResult),
        isCharacterDevice: statResult.isCharacterDevice.bind(statResult),
        isDirectory: statResult.isDirectory.bind(statResult),
        isFIFO: statResult.isFIFO.bind(statResult),
        isFile: statResult.isFile.bind(statResult),
        isSocket: statResult.isSocket.bind(statResult),
        isSymbolicLink: statResult.isSymbolicLink.bind(statResult),
    };
};

export const getEntityDescriptorWithAlias = (pathname: string): EntityDescriptor => {
    const collectionType = getCollectionType(pathname);

    if (!collectionType) {
        return null;
    }

    const moduleFileName = readdirSync(path.dirname(pathname)).find((filename) => {
        return getCollectionType(path.resolve(path.dirname(pathname), filename)) === 'module';
    });

    if (!moduleFileName) {
        return null;
    }

    const moduleName = moduleFileName.split('.')[0];
    const pathDescriptor = getPathDescriptorWithAlias(pathname);
    const modulePrefixName = path.relative(normalizeModulesPath(), path.dirname(pathname))
        .split(path.sep)
        .slice(0, -1)
        .join('.') || '';
    const entityName = normalizeNoExtensionPath(path.basename(pathname));

    return {
        ...pathDescriptor,
        entityName,
        collectionType,
        moduleName: `${modulePrefixName ? modulePrefixName + '.' : ''}${moduleName}`,
    };
};

export const getCollectionType = (pathname: string): CollectionType => {
    const collectionMap = projectConfigParser.getConfig('collection');
    for (const collectionType of Object.keys(collectionMap)) {
        for (const filenamePattern of collectionMap[collectionType]) {
            const matchResult = new RegExp(`${filenamePattern.replace('*', '(.*)')}$`).exec(pathname);
            if (matchResult && matchResult.length > 1) {
                return collectionType as CollectionType;
            }
        }
    }
    return null;
};

export const matchAlias = (pathname: string): boolean => {
    const alias = projectConfigParser.getConfig('alias') || {};
    for (const aliasKey of Object.keys(alias)) {
        const normalizedAliasPath = normalizeAlias(aliasKey);
        const aliasPathRegExp = new RegExp(normalizedAliasPath, 'gi');
        const execResult = aliasPathRegExp.exec(pathname);

        if (
            !aliasKey ||
            !alias[aliasKey] ||
            !execResult ||
            execResult.length < 2
        ) {
            continue;
        } else {
            return true;
        }
    }
    return false;
};
