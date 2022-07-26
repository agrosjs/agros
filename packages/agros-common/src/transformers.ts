import { ProjectConfigParser } from '@agros/config';
import {
    normalizeAbsolutePath,
    normalizeAlias,
    normalizeSrcPath,
} from './normalizers';
import * as path from 'path';
import parseGlob from 'parse-glob';

export const transformPathToAliasedPath = (absolutePath: string, dirname = ''): string => {
    const projectConfigParser = new ProjectConfigParser();
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
        return dirname
            ? path.relative(dirname, absolutePath)
            : absolutePath;
    }

    const aliasKeyGlobPattern = parseGlob(aliasResult.aliasKey);

    return aliasKeyGlobPattern.is.glob
        ? path.join(aliasKeyGlobPattern.path.dirname, aliasResult.matchedPart)
        : path.join(aliasResult.aliasKey, aliasResult.matchedPart);
};

export const transformAliasedPathToPath = (aliasedPath: string): string => {
    const projectConfigParser = new ProjectConfigParser();
    /**
     * relative pathname without `baseDir`
     */
    let relativePath: string;
    const alias = projectConfigParser.getConfig('alias') || {};

    for (const aliasKey of Object.keys(alias)) {
        const normalizedAliasPath = normalizeAlias(aliasKey);
        const aliasPathRegExp = new RegExp(normalizedAliasPath, 'gi');
        const execResult = aliasPathRegExp.exec(aliasedPath);

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
        normalizeAbsolutePath(aliasedPath, normalizeSrcPath()),
    );

    return normalizeAbsolutePath(parsedRelativePath);
};
