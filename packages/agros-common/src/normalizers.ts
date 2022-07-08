import * as path from 'path';
import { ProjectConfigParser } from '@agros/config';

const projectConfigParser = new ProjectConfigParser();

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

export const normalizeRelativePath = (pathname: string, dirname: string = normalizeSrcPath()) => {
    return path.relative(dirname, pathname);
};

export const normalizeModulesPath = () => {
    return path.resolve(normalizeSrcPath(), projectConfigParser.getConfig('modulesDir'));
};

export const normalizeAlias = (aliasKey: string) => {
    if (!aliasKey) {
        return '';
    }

    let result = aliasKey.replace(/\*\*(\/?)/gi, '');

    if (result !== '*' && !result.endsWith('/*')) {
        result += '/*';
    }

    return result.replace(/\*/gi, '(.*)');
};

export const normalizeCollectionPattern = (pattern: string) => {
    if (!pattern) {
        return '';
    }

    let result = pattern.replace(/\*\*(\/?)/gi, '').replace('*', '(.*)');

    if (!result.startsWith('(.*).')) {
        result = '(.*).' + result;
    }

    return result;
};

export const normalizeNoExtensionPath = (pathname: string) => pathname.split('.').slice(0, -1).join('.');
