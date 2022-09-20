import {
    statSync,
    existsSync,
    readdirSync,
} from 'fs';
import { CollectionType } from './types';
import {
    EntityDescriptor,
    PathDescriptor,
} from './descriptor-types';
import {
    normalizeAlias,
    normalizeCollectionPattern,
    normalizeModulesPath,
    normalizeNoExtensionPath,
    normalizeRelativePath,
} from './normalizers';
import {
    ProjectConfigParser,
} from './config-parsers';
import * as path from 'path';
import {
    transformAliasedPathToPath,
    transformPathToAliasedPath,
} from './transformers';
import { cosmiconfigSync } from 'cosmiconfig';
import _ from 'lodash';

const projectConfigParser = new ProjectConfigParser();

export const getPathDescriptorWithAlias = (pathname: string): PathDescriptor => {
    const absolutePath = transformAliasedPathToPath(pathname);

    if (!existsSync(absolutePath)) {
        return null;
    }

    const statResult = statSync(absolutePath);

    return {
        id: normalizeNoExtensionPath(normalizeRelativePath(absolutePath)),
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

    const moduleName = getFileEntityIdentifier(moduleFileName);
    const pathDescriptor = getPathDescriptorWithAlias(pathname);
    const modulePrefixName = path.relative(normalizeModulesPath(), path.dirname(pathname))
        .split(path.sep)
        .slice(0, -1)
        .join('.') || '';
    const entityName = normalizeNoExtensionPath(path.basename(pathname)).split('.')[0];

    return {
        ...pathDescriptor,
        entityName,
        collectionType,
        moduleName: `${modulePrefixName ? modulePrefixName + '.' : ''}${moduleName}`,
        modules: [],
    };
};

export const getCollectionType = (pathname: string): CollectionType => {
    const collectionMap = projectConfigParser.getConfig('collection');
    for (const collectionType of Object.keys(collectionMap)) {
        for (const filenamePattern of collectionMap[collectionType]) {
            const matchResult = new RegExp(`${normalizeCollectionPattern(filenamePattern)}$`).exec(pathname);
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

export const getFileEntityIdentifier = (pathname: string) => {
    const basename = path.basename(pathname);
    const collectionType = getCollectionType(pathname);

    let identifier = basename.split('.')[0];

    if (!collectionType) {
        return identifier;
    }

    const patterns = projectConfigParser.getConfig(`collection.${collectionType}`);

    if (!patterns || !Array.isArray(patterns) || patterns.length === 0) {
        return identifier;
    }

    for (const pattern of patterns) {
        const execResult = new RegExp(normalizeCollectionPattern(pattern) + '$').exec(basename);
        if (!execResult || !execResult[1]) {
            continue;
        }
        identifier = execResult[1];
        break;
    }

    return identifier;
};

export const getESLintIndentSize = (eslintPath = process.cwd()) => {
    const { config = {} } = cosmiconfigSync('eslint').search(eslintPath) || {};
    let tabWidth = 2;
    const indentRule = _.get(config, 'rules.indent') || _.get(config, 'rules["@typescript-eslint/indent"]');

    if (!indentRule) {
        return tabWidth;
    }

    if (Array.isArray(indentRule)) {
        tabWidth = indentRule[1];
    } else if (typeof indentRule === 'number') {
        tabWidth = indentRule;
    }

    return tabWidth;
};

export const getCosmiConfig = (moduleName: string) => {
    const explorer = cosmiconfigSync(moduleName);
    const searchResult = explorer.search();
    const config = _.get(searchResult, 'config') || {};
    return config;
};
