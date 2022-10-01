import * as path from 'path';
import { ProjectConfigParser } from './config-parsers';
import parseGlob from 'parse-glob';
import {
    CollectionType,
    EntityDescriptor,
} from './types';
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

export const normalizeCLIPath = (pathname: string, entities: EntityDescriptor[], collectionType?: string) => {
    if (!pathname || !_.isString(pathname)) {
        return null;
    }

    const collectionTypes = Object.keys(projectConfigParser.getConfig<Record<string, string[]>>('collection') || {});
    let result: EntityDescriptor = null;

    const testAbsolutePath = path.resolve(process.cwd(), pathname);
    result = entities.find((entity) => entity.absolutePath === testAbsolutePath);

    if (result) {
        return result;
    }

    let [moduleScope, pathnameBody = ''] = pathname.split(':');

    if (moduleScope && !pathnameBody) {
        pathnameBody = moduleScope;
        moduleScope = null;
    }

    let [entityName, entityCollectionType] = pathnameBody.split('.');

    if (_.isString(collectionType) && !!collectionType) {
        entityCollectionType = collectionType;
    }

    if (!moduleScope) {
        moduleScope = entityName;
    }

    if (!moduleScope || !entityName || !entityCollectionType) {
        return null;
    }

    if (collectionTypes.indexOf(entityCollectionType) === -1) {
        return null;
    }

    result = entities.find(({
        moduleName,
        entityName: currentEntityName,
        collectionType: currentCollectionType,
    }) => {
        return moduleName === moduleScope && entityName === currentEntityName && entityCollectionType === currentCollectionType;
    });

    return result;
};
