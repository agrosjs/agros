import * as path from 'path';
import * as fs from 'fs-extra';
import { parseAST } from './parse-ast';
import { EntityDescriptor } from './types';
import { normalizeModulesPath, normalizeRelativePath } from './normalizers';
import {
    getCollectionType,
    getEntityDescriptorWithAlias,
    getFileEntityIdentifier,
} from './utils';
import {
    detectDecorators,
    detectImportSpecifierMap,
} from './detectors';
import * as t from '@babel/types';

export interface ModuleCollectionMap {
    components: string[];
    providers: string[];
    exports: string[];
}

export const scanModuleCollectionMap = (entityDescriptor: EntityDescriptor): ModuleCollectionMap => {
    const result: ModuleCollectionMap = {
        components: [],
        providers: [],
        exports: [],
    };

    if (entityDescriptor.collectionType !== 'module') {
        return result;
    }

    const source = fs.readFileSync(entityDescriptor.absolutePath).toString();
    const tree = parseAST(source);
    const [moduleDecorator] = detectDecorators(tree, 'Module');

    if (
        !moduleDecorator ||
        moduleDecorator.expression.type !== 'CallExpression' ||
        moduleDecorator.expression.arguments[0]?.type !== 'ObjectExpression'
    ) {
        return result;
    }

    const moduleMetadataExpression = moduleDecorator.expression.arguments[0] as t.ObjectExpression;
    const importSpecifierMap = detectImportSpecifierMap(tree);

    for (const propertyName of Object.keys(result)) {
        const property: t.ObjectProperty = moduleMetadataExpression.properties.find((property) => {
            return property.type === 'ObjectProperty' && (
                (property.key.type === 'Identifier' && property.key.name === propertyName) ||
                    (property.key.type === 'StringLiteral' && property.key.value === propertyName)
            ) && property.value.type === 'ArrayExpression';
        }) as t.ObjectProperty;

        if (!property) {
            continue;
        }

        for (const arrayItem of (property.value as t.ArrayExpression).elements) {
            let keyName: string;

            switch (arrayItem.type) {
                case 'Identifier': {
                    keyName = arrayItem.name;
                    break;
                }
                case 'StringLiteral': {
                    keyName = arrayItem.value;
                    break;
                }
                default:
                    break;
            }

            const importedEntityPathname = importSpecifierMap[keyName];

            if (!importedEntityPathname) {
                continue;
            }

            result[propertyName].push(normalizeRelativePath(importedEntityPathname));
        }
    }

    return result;
};

export const scanProjectEntities = (startPath = normalizeModulesPath()): EntityDescriptor[] => {
    const scanner = (startPath = normalizeModulesPath()): EntityDescriptor[] => {
        if (!fs.existsSync(startPath) || !fs.statSync(startPath).isDirectory()) {
            return [];
        }

        let moduleName: string;
        let currentResult: EntityDescriptor[] = [];
        const rawDirEntityNames: string[] = fs.readdirSync(startPath) || [];
        const moduleEntityNames = rawDirEntityNames.filter((rawDirEntityName) => {
            return getCollectionType(rawDirEntityName) === 'module';
        });

        if (moduleEntityNames.length === 1) {
            moduleName = getFileEntityIdentifier(moduleEntityNames[0]);
        } else {
            const moduleEntityName = moduleEntityNames.find((moduleEntityName) => {
                return getFileEntityIdentifier(moduleEntityName) === path.basename(startPath);
            });
            if (moduleEntityName) {
                moduleName = getFileEntityIdentifier(moduleEntityName);
            }
        }

        if (!moduleName && path.relative(normalizeModulesPath(), startPath)) {
            return currentResult;
        }

        for (const rawDirEntityName of rawDirEntityNames) {
            const absolutePath = path.resolve(startPath, rawDirEntityName);
            const entityDescriptor = getEntityDescriptorWithAlias(absolutePath);

            if (fs.statSync(absolutePath).isDirectory()) {
                currentResult = currentResult.concat(scanner(path.resolve(startPath, rawDirEntityName)));
                continue;
            }

            if (!entityDescriptor) {
                continue;
            }

            currentResult = currentResult.concat(entityDescriptor);
        }

        return currentResult;
    };

    let entities = scanner(startPath);
    const moduleCollectionMap: Record<string, ModuleCollectionMap> = entities.reduce((result, entity) => {
        if (entity.collectionType === 'module') {
            result[entity.id] = scanModuleCollectionMap(entity);
        }
        return result;
    }, {} as Record<string, ModuleCollectionMap>);

    entities = entities.map((entity) => {
        if (entity.collectionType !== 'module') {
            entity.modules = entities.filter((moduleEntity) => {
                if (moduleEntity.collectionType !== 'module') {
                    return false;
                }
                const collectionMap = moduleCollectionMap[moduleEntity.id];
                if (!collectionMap) {
                    return false;
                }
                const {
                    providers = [],
                    components = [],
                } = collectionMap;

                return [].concat(providers).concat(components).indexOf(entity.id) !== -1;
            });
        }
        return entity;
    });

    return entities;
};
