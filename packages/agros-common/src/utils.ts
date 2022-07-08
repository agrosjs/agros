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
    normalizeCollectionPattern,
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
import { cosmiconfigSync } from 'cosmiconfig';
import { ESLint } from 'eslint';
import _ from 'lodash';

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

    const moduleName = getFileEntityIdentifier(moduleFileName);
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

export const lintCode = async (code: string): Promise<string> => {
    const eslintConfigPaths = [
        path.resolve(process.cwd(), 'node_modules/@agros/config/.eslintrc.js'),
        path.resolve(__dirname, '../node_modules/@agros/config/.eslintrc.js'),
    ];
    const currentProjectESLintConfig = cosmiconfigSync('eslint').search();
    const eslintConfigFilePath = currentProjectESLintConfig?.filepath
        ? currentProjectESLintConfig.filepath
        : eslintConfigPaths.find((pathname) => existsSync(pathname));
    const eslint = new ESLint({
        allowInlineConfig: true,
        cwd: path.dirname(eslintConfigFilePath),
        overrideConfig: {
            rules: {
                'array-element-newline': ['error', 'always'],
                'array-bracket-newline': ['error', 'always'],
                'no-undef': 'off',
                'no-unused-vars': 'off',
            },
        },
        fix: true,
    });

    const lintResultList = await eslint.lintText(code);

    return _.get(lintResultList, '[0].output') || code;
};
