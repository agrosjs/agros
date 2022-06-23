import * as path from 'path';
import {
    Dirent,
    statSync,
    existsSync,
} from 'fs';
import { ProjectConfigParser } from '@agros/config';
import parseGlob from 'parse-glob';

const projectConfigParser = new ProjectConfigParser();

export interface PathDescriptor extends Omit<Dirent, 'name'> {
    relativePath: string;
    absolutePath: string;
    aliasPath: string | null;
    filename: string;
}

/**
 * normalize a relative pathname with project src path
 * example: ./modules/foo/foo.module.ts => src/modules/foo/foo.module.ts
 * @returns {string} pathname
 */
export const normalizeSrcPath = () => {
    return path.resolve(process.cwd(), projectConfigParser.getConfig('baseDir'));
};

export const normalizeAbsolutePath = (pathname: string, dirname: string = normalizeSrcPath()) => {
    return path.resolve(dirname, pathname);
};

export const normalizeModulesPath = () => {
    return path.resolve(normalizeSrcPath(), projectConfigParser.getConfig('modulesDir'));
};

export const normalizeAlias = (aliasKey: string) => {
    if (!aliasKey) {
        return '';
    }

    let result = aliasKey.replace(/\*\*(\/?)/gi, '');

    if (!result.endsWith('/*')) {
        result += '/*';
    }

    return result.replace(/\*/gi, '(.*)');
};

export const getPathDescriptorWithAlias = (pathname: string, dirname = normalizeSrcPath()): PathDescriptor => {
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
        normalizeAbsolutePath(pathname, dirname),
    );
    const absolutePath = normalizeAbsolutePath(parsedRelativePath);

    if (!existsSync(absolutePath)) {
        return null;
    }

    const {
        isBlockDevice,
        isCharacterDevice,
        isDirectory,
        isFIFO,
        isFile,
        isSocket,
        isSymbolicLink,
    } = statSync(absolutePath);

    return {
        relativePath: parsedRelativePath,
        aliasPath: relativePath ? pathname : null,
        absolutePath,
        filename: path.basename(absolutePath),
        isBlockDevice,
        isCharacterDevice,
        isDirectory,
        isFIFO,
        isFile,
        isSocket,
        isSymbolicLink,
    };
};
