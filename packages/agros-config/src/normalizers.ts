import * as path from 'path';
import {
    Dirent,
    statSync,
} from 'fs';
import { ProjectConfigParser } from './project-config-parser';
import { normalizeAlias } from '@agros/utils';
import parseGlob from 'parse-glob';

const projectConfigParser = new ProjectConfigParser();

export interface PathDescriptor extends Omit<Dirent, 'name'> {
    relativePath: string;
    absolutePath: string;
    aliasPath: string | null;
    filename: string;
}

export const normalizeSrcPath = () => {
    return path.resolve(process.cwd(), projectConfigParser.getConfig('baseDir'));
};

export const normalizeAbsolutePath = (pathname: string) => {
    return path.resolve(normalizeSrcPath(), pathname);
};

export const getPathDescriptorWithAlias = (pathname: string): PathDescriptor => {
    /**
     * relative pathname without `baseDir`
     */
    let relativePath: string;
    const alias = projectConfigParser.getConfig('alias') || {};

    for (const aliasKey of Object.keys(alias)) {
        const normalizedAliasPath = normalizeAlias(aliasKey);
        const aliasPathRegExp = new RegExp(normalizedAliasPath, 'gi');

        if (
            !aliasKey ||
            !alias[aliasKey] ||
            !aliasPathRegExp.exec(pathname) ||
            aliasPathRegExp.exec(pathname).length < 2
        ) {
            continue;
        }

        const tailPath = path.join(...aliasPathRegExp.exec(pathname).slice(1));
        const aliasValueGlobPattern = parseGlob(alias[aliasKey]);

        relativePath = aliasValueGlobPattern.is.glob
            ? path.join(aliasValueGlobPattern.path.basename, tailPath)
            : path.join(alias[aliasKey], tailPath);

        break;
    }

    const parsedRelativePath = relativePath || path.relative(normalizeSrcPath(), pathname);
    const absolutePath = normalizeAbsolutePath(parsedRelativePath);
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
