import parseGlob from 'parse-glob';
import {
    statSync,
    existsSync,
} from 'fs';
import { PathDescriptor } from './types';
import {
    normalizeAbsolutePath,
    normalizeAlias,
    normalizeSrcPath,
} from './normalizers';
import {
    CollectionType,
    ProjectConfigParser,
} from '@agros/config';
import * as path from 'path';

const projectConfigParser = new ProjectConfigParser();

export const getPathDescriptorWithAlias = (pathname: string): PathDescriptor => {
    /**
     * relative pathname without `baseDir`
     */
    let relativePath: string;
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
        }

        const tailPath = path.join(...execResult.slice(1, execResult.length));
        const aliasValueGlobPattern = parseGlob(alias[aliasKey]);

        relativePath = aliasValueGlobPattern.is.glob
            ? path.join(aliasValueGlobPattern.path.dirname, tailPath)
            : path.join(alias[aliasKey], tailPath);

        break;
    }

    const parsedRelativePath = relativePath || path.relative(
        normalizeSrcPath(),
        normalizeAbsolutePath(pathname, normalizeSrcPath()),
    );
    const absolutePath = normalizeAbsolutePath(parsedRelativePath);

    if (!existsSync(absolutePath)) {
        return null;
    }

    const statResult = statSync(absolutePath);

    return {
        relativePath: parsedRelativePath,
        aliasPath: getAliasedPath(absolutePath),
        absolutePath,
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

export const getAliasedPath = (absolutePath: string): string => {
    const alias = projectConfigParser.getConfig('alias') || {};
    const srcAbsolutePath = normalizeSrcPath();

    const aliasResultList = Object.keys(alias)
        .map((aliasKey) => {
            const normalizedAliasPath = normalizeAlias(alias[aliasKey]);
            const aliasPathRegExp = new RegExp(normalizedAliasPath, 'gi');
            const relativePath = path.relative(srcAbsolutePath, absolutePath);
            const execResult = aliasPathRegExp.exec(relativePath);

            if (
                !aliasKey ||
                !alias[aliasKey] ||
                !execResult ||
                execResult.length < 2
            ) {
                return null;
            }

            return {
                relativePath,
                aliasKey,
                aliasValue: normalizeAlias(alias[aliasKey]),
                matchedPart: execResult[1],
            };
        })
        .filter((resultItem) => !!resultItem)
        .sort((prev, next) => prev.matchedPart.length - next.matchedPart.length);

    const aliasResult = aliasResultList.shift();

    if (!aliasResult) {
        return absolutePath;
    }

    const aliasKeyGlobPattern = parseGlob(aliasResult.aliasKey);

    return aliasKeyGlobPattern.is.glob
        ? path.join(aliasKeyGlobPattern.path.dirname, aliasResult.matchedPart)
        : path.join(aliasResult.aliasKey, aliasResult.matchedPart);
};
