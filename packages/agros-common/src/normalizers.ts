import * as path from 'path';
import {
    CollectionType,
    ProjectConfigParser,
} from '@agros/config';
import parseGlob from 'parse-glob';
import { EntityDescriptor } from './types';
import _ from 'lodash';

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

export const normalizeEntityFileName = (type: CollectionType, name: string, fallbackSchema?: string) => {
    if ((!type && !fallbackSchema) || !name) {
        return null;
    }

    const collectionFileSchemas = projectConfigParser.getConfig<string[]>('collection.' + type) || [];

    if ((!collectionFileSchemas || collectionFileSchemas.length === 0) && !fallbackSchema) {
        return null;
    }

    const schema = collectionFileSchemas[0] || fallbackSchema;
    const schemaParseResult = parseGlob(schema);
    let extname = schemaParseResult.is.glob
        ? schemaParseResult.path.extname
        : schema;

    return `${name}.`.concat(extname.replace(/^\.+/g, ''));
};

export const normalizeCLIPath = (pathname: string, entities: EntityDescriptor[]) => {
    if (!pathname || !_.isString(pathname)) {
        return null;
    }

    const regexResult = /(\w+:)?(\w+).(\w+)/g.exec(pathname);

    let moduleScope: string;
    let entityName: string;
    let collectionType: string;
    let result: string = null;

    if (regexResult) {
        moduleScope = regexResult[1];
        entityName = regexResult[2];
        collectionType = regexResult[3];

        if (moduleScope) {
            moduleScope = moduleScope.replace(/:+$/g, '');
        } else {
            moduleScope = entityName;
        }
    }

    if (!regexResult || !entityName || !collectionType) {
        const absolutePath = path.resolve(process.cwd(), pathname);

        if (entities.some((entity) => entity.absolutePath === absolutePath)) {
            result = absolutePath;
        }
    } else {
        const entityDescriptor = entities.find((entity) => entity.entityName === entityName && entity.collectionType === collectionType);

        if (entityDescriptor) {
            result = entityDescriptor.absolutePath;
        }
    }

    return result;
};
