import { EntityDescriptor } from './types';
import * as fs from 'fs';
import {
    ClassImportItem,
    detectExports,
    detectDecorators,
    detectImportedClass,
    detectLastImportLine,
} from './detectors';
import { parseAST } from '@agros/utils/lib/parse-ast';
import * as t from '@babel/types';
import {
    generateConstructorCode,
    generateDecoratorCode,
} from './code-generators';
import { ParseResult } from '@babel/parser';
import _ from 'lodash';

export interface UpdateItem {
    line: number;
    content: string[];
    deleteLines: number;
    cutLine?: t.SourceLocation;
};

export type Updater<T> = (data: {
    sourceDescriptor: EntityDescriptor,
    targetDescriptor: EntityDescriptor,
    targetAST: ParseResult<t.File>,
    classImportItem: ClassImportItem<t.ClassDeclaration>,
    initialResult: UpdateItem[],
    options?: T;
}) => Promise<UpdateItem[]>;

export type UpdaterWithChecker<T = any> = (
    sourceDescriptor: EntityDescriptor,
    targetDescriptor: EntityDescriptor,
    options?: T,
) => Promise<UpdateItem[]>;

const createUpdater = <T = Record<string, any>>(
    updater: Updater<T>,
    check: (source: EntityDescriptor, target: EntityDescriptor) => boolean = () => true,
): UpdaterWithChecker<T> => {
    return async (
        sourceDescriptor: EntityDescriptor,
        targetDescriptor: EntityDescriptor,
        options: T = {} as T,
    ) => {
        const result: UpdateItem[] = [];

        if (
            !check(sourceDescriptor, targetDescriptor) ||
                !fs.existsSync(sourceDescriptor.absolutePath) ||
                !fs.existsSync(targetDescriptor.absolutePath)
        ) {
            return result;
        }

        const importedClass = await detectImportedClass(
            sourceDescriptor.absolutePath,
            targetDescriptor.absolutePath,
        );
        const {
            exportItem,
            imported,
            importLiteralValue,
        } = importedClass;

        if (!exportItem) {
            return [];
        }

        const targetAST = parseAST(fs.readFileSync(targetDescriptor.absolutePath).toString());

        if (!imported) {
            result.push({
                line: detectLastImportLine(targetAST),
                content: importLiteralValue.split(/\r|\n|\r\n/),
                deleteLines: 0,
            });
        }

        return await updater({
            targetAST,
            sourceDescriptor,
            targetDescriptor,
            classImportItem: importedClass,
            initialResult: result,
            options,
        });
    };
};

export interface UpdateImportedEntityToModuleOptions {
    skipExport?: boolean;
    asyncModule?: boolean,
}

export const updateImportedEntityToModule = createUpdater<UpdateImportedEntityToModuleOptions>(
    async ({
        sourceDescriptor,
        targetDescriptor,
        targetAST,
        classImportItem: originalClassImportItem,
        initialResult,
        options,
    }) => {
        const {
            skipExport,
            asyncModule,
        } = options;
        let classImportItem = originalClassImportItem;
        const result = asyncModule ? [] : Array.from(initialResult) as UpdateItem[];
        const [decorator] = detectDecorators(targetAST, 'Module');

        if (!decorator) {
            return result;
        }

        if (asyncModule) {
            classImportItem = await detectImportedClass(
                sourceDescriptor.absolutePath,
                targetDescriptor.absolutePath,
                true,
            );
            if (!classImportItem.imported) {
                result.push({
                    line: detectLastImportLine(targetAST),
                    content: (classImportItem.importLiteralValue || '').split(/\r|\n|\r\n/),
                    deleteLines: 0,
                });
            }
        }

        const { identifierName } = classImportItem;

        if (!decorator.expression.arguments[0]) {
            decorator.expression.arguments.push(t.objectExpression([]));
        }

        const argument = decorator.expression.arguments[0];

        if (argument.type !== 'ObjectExpression') {
            return result;
        }

        let decoratorProperties: string[];

        if (!sourceDescriptor.collectionType) {
            return result;
        }

        switch (sourceDescriptor.collectionType) {
            case 'component': {
                decoratorProperties = ['components', ...(skipExport ? [] : ['exports'])];
                break;
            }
            case 'module': {
                decoratorProperties = ['imports'];
                break;
            }
            default: {
                decoratorProperties = ['providers', ...(skipExport ? [] : ['exports'])];
                break;
            }
        }

        let shouldUpdate = false;

        for (const decoratorProperty of decoratorProperties) {
            let property: t.ObjectProperty = argument.properties.find((property) => {
                return property.type === 'ObjectProperty' && (
                    (property.key.type === 'Identifier' && property.key.name === decoratorProperty) ||
                        (property.key.type === 'StringLiteral' && property.key.value === decoratorProperty)
                ) && property.value.type === 'ArrayExpression';
            }) as t.ObjectProperty;

            if (!property) {
                property = t.objectProperty(
                    t.identifier(decoratorProperty),
                    t.arrayExpression([]),
                );
                argument.properties.push(property);
            }

            if (
                !(property.value as t.ArrayExpression).elements.some((element) => {
                    return element.type === 'Identifier' && element.name === identifierName;
                })
            ) {
                shouldUpdate = true;
                (property.value as t.ArrayExpression).elements.push(t.identifier(identifierName));
            }
        }

        if (shouldUpdate) {
            const decoratorCode = await generateDecoratorCode(decorator);
            result.push({
                line: decorator.loc?.start.line,
                content: decoratorCode.split(/\r|\n|\r\n/).map((line) => {
                    return new Array(decorator.loc?.start.column).fill(' ').join('') + line;
                }),
                deleteLines: decorator.loc?.end.line - decorator.loc?.start.line + 1,
            });
        }

        return result;
    },
    (source, target) => source.collectionType && target.collectionType === 'module',
);

export interface UpdateImportedServiceToServiceOptions {
    skipReadonly?: boolean;
    accessibility?: 'public' | 'private' | 'protected';
}

export const updateImportedInjectableToInjectable = createUpdater<UpdateImportedServiceToServiceOptions>(
    async ({
        classImportItem,
        initialResult,
        targetAST,
        options,
    }) => {
        const result = Array.from(initialResult) as UpdateItem[];
        const [targetServiceClassExportItem] = detectExports<t.ClassDeclaration>(targetAST, 'ClassDeclaration');

        if (!targetServiceClassExportItem) {
            return result;
        }

        const { declaration } = targetServiceClassExportItem;

        const classBody = declaration.body.body || [];
        let constructorDeclaration: t.ClassMethod = classBody.find((statement) => {
            return statement.type === 'ClassMethod' && (
                statement.kind === 'constructor' ||
                    (statement.key.type === 'Identifier' && statement.key.name === 'constructor')
            );
        }) as t.ClassMethod;

        if (!constructorDeclaration) {
            constructorDeclaration = t.classMethod(
                'constructor',
                t.identifier('constructor'),
                [],
                t.blockStatement([]),
            );
            constructorDeclaration.accessibility = 'public';
            classBody.push(constructorDeclaration);
        }

        const parameterExisted = constructorDeclaration.params.some((parameter) => {
            let typeAnnotation: t.TypeAnnotation | t.TSTypeAnnotation;

            if (parameter.type === 'Identifier' && parameter.typeAnnotation?.type !== 'Noop') {
                typeAnnotation = parameter.typeAnnotation;
            } else if (parameter.type === 'TSParameterProperty' && parameter.parameter.typeAnnotation?.type !== 'Noop') {
                typeAnnotation = parameter.parameter.typeAnnotation;
            }

            if (!typeAnnotation) {
                return false;
            }

            if (
                typeAnnotation?.typeAnnotation?.type === 'TSTypeReference' &&
                    typeAnnotation?.typeAnnotation?.typeName?.type === 'Identifier' &&
                    typeAnnotation?.typeAnnotation?.typeName?.name === classImportItem.identifierName
            ) {
                return true;
            }

            return false;
        });

        if (parameterExisted) {
            return result;
        }

        const parameterPropertyStatement = t.tsParameterProperty(
            t.identifier(
                _.camelCase(classImportItem.identifierName),
            ),
        );
        parameterPropertyStatement.accessibility = options?.accessibility || 'private';
        parameterPropertyStatement.readonly = !options?.skipReadonly;
        parameterPropertyStatement.parameter.typeAnnotation = t.tsTypeAnnotation(
            t.tsTypeReference(t.identifier(classImportItem.identifierName)),
        );
        constructorDeclaration.params.push(parameterPropertyStatement);
        let deleteLines = 0;

        if (constructorDeclaration?.loc?.start && constructorDeclaration?.loc?.end) {
            const {
                end,
                start,
            } = constructorDeclaration.loc || {};
            deleteLines = end.line - start.line + 1;
        }

        const code = await generateConstructorCode(constructorDeclaration);

        const constructorUpdateItem: UpdateItem = {
            deleteLines,
            content: code.split(/\r|\n|\r\n/),
            line: constructorDeclaration?.loc?.start?.line || (declaration.body.loc?.start.line + 1),
        };
        const {
            loc,
        } = declaration.body;

        if (loc && loc?.start?.line === loc?.end?.line) {
            constructorUpdateItem.cutLine = declaration.body.loc;
        }

        result.push(constructorUpdateItem);

        return result;
    },
    (source, target) => source.collectionType === 'service' && target.collectionType === 'service',
);

export const updateImportedEntityToComponent = createUpdater(
    async ({
        targetAST,
        classImportItem,
        initialResult,
    }) => {
        const DECORATOR_DECLARATION_KEY = 'declarations';
        const { identifierName } = classImportItem;
        const result = Array.from(initialResult) as UpdateItem[];

        const [decorator] = detectDecorators(targetAST, 'Component');

        if (!decorator) {
            return result;
        }

        if (!decorator.expression.arguments[0]) {
            decorator.expression.arguments.push(
                t.objectExpression([
                    t.objectProperty(
                        t.identifier(DECORATOR_DECLARATION_KEY),
                        t.arrayExpression([
                            t.identifier(identifierName),
                        ]),
                    ),
                ]),
            );
        }

        const argument = decorator.expression.arguments[0];

        if (argument.type !== 'ObjectExpression') {
            return result;
        }

        let property: t.ObjectProperty = argument.properties.find((property) => {
            return property.type === 'ObjectProperty' && (
                (property.key.type === 'Identifier' && property.key.name === DECORATOR_DECLARATION_KEY) ||
                (property.key.type === 'StringLiteral' && property.key.value === DECORATOR_DECLARATION_KEY)
            ) && property.value.type === 'ArrayExpression';
        }) as t.ObjectProperty;

        if (!property) {
            property = t.objectProperty(
                t.identifier(DECORATOR_DECLARATION_KEY),
                t.arrayExpression([]),
            );
            argument.properties.push(property);
        }

        const shouldUpdate = !(property.value as t.ArrayExpression).elements.some((element) => {
            return element.type === 'Identifier' && element.name === identifierName;
        });

        if (shouldUpdate) {
            (property.value as t.ArrayExpression).elements.push(t.identifier(identifierName));
            const decoratorCode = await generateDecoratorCode(decorator);
            result.push({
                line: decorator.loc?.start.line,
                content: decoratorCode.split(/\r|\n|\r\n/).map((line) => {
                    return new Array(decorator.loc?.start.column).fill(' ').join('') + line;
                }),
                deleteLines: decorator.loc?.end.line - decorator.loc?.start.line + 1,
            });
        }

        return result;
    },
    (source, target) => ['component', 'service'].indexOf(source.collectionType) !== -1 && target.collectionType === 'component',
);

export interface UpdateRouteToModuleOptions {
    path?: string;
}

export const updateRouteToModule = createUpdater<UpdateRouteToModuleOptions>(
    async ({
        initialResult,
        classImportItem,
        targetAST,
        options,
        sourceDescriptor,
    }) => {
        const pathname = (options.path || '').replace(/^\/+/, '').replace(/\/+/g, '/');

        if (!pathname) {
            return initialResult;
        }

        const { identifierName } = classImportItem;
        const result = Array.from(initialResult) as UpdateItem[];
        const [decorator] = detectDecorators(targetAST, 'Module');

        if (!decorator) {
            return result;
        }

        if (!decorator.expression.arguments[0]) {
            decorator.expression.arguments.push(
                t.objectExpression([
                    t.objectProperty(
                        t.identifier('imports'),
                        t.arrayExpression([
                            t.identifier(identifierName),
                        ]),
                    ),
                ]),
            );
        }

        const argument = decorator.expression.arguments[0] as t.ObjectExpression;

        if (argument.type !== 'ObjectExpression') {
            return result;
        }

        let routesPropertyDeclaration: t.ObjectProperty = argument.properties.find((property) => {
            return property.type === 'ObjectProperty' && (
                (property.key.type === 'Identifier' && property.key.name === 'routes') ||
                (property.key.type === 'StringLiteral' && property.key.value === 'routes')
            );
        }) as t.ObjectProperty;

        if (!routesPropertyDeclaration) {
            routesPropertyDeclaration = t.objectProperty(
                t.identifier('routes'),
                t.arrayExpression([]),
            );
            argument.properties.push(routesPropertyDeclaration);
        } else if (routesPropertyDeclaration.value.type !== 'ArrayExpression') {
            routesPropertyDeclaration.value = t.arrayExpression([]);
        }

        routesPropertyDeclaration.value = routesPropertyDeclaration.value as t.ArrayExpression;

        const createRoutePathProperties = (currentPathname: string) => ([
            t.objectProperty(
                t.identifier('path'),
                t.stringLiteral(currentPathname),
            ),
            t.objectProperty(
                t.identifier(_.camelCase('use_' + sourceDescriptor.collectionType + '_class')),
                t.identifier(identifierName),
            ),
        ]);

        const traverseObjectExpression = (pathname: string, arrayExpression: t.ArrayExpression) => {
            const leadingPathSegment = pathname.split('/')[0];
            const matchedRouteConfigExpression: t.ObjectExpression = arrayExpression.elements.find((element) => {
                return element.type === 'ObjectExpression' &&
                    element.properties.find((property) => {
                        return property.type === 'ObjectProperty' && (
                            (property.key.type === 'Identifier' && property.key.name === 'path') ||
                            (property.key.type === 'StringLiteral' && property.key.value === 'path')
                        ) && property.value.type === 'StringLiteral' && property.value.value === leadingPathSegment;
                    });
            }) as t.ObjectExpression;

            if (matchedRouteConfigExpression) {
                if (pathname.split('/').length <= 1) {
                    return;
                }

                const childrenPropertyDeclaration: t.ObjectProperty = matchedRouteConfigExpression.properties.find((property) => {
                    return property.type === 'ObjectProperty' && (
                        (property.key.type === 'Identifier' && property.key.name === 'children') ||
                        (property.key.type === 'StringLiteral' && property.key.value === 'children')
                    ) && property.value.type === 'ArrayExpression';
                }) as t.ObjectProperty;

                let childrenArrayExpression: t.ArrayExpression;

                if (childrenPropertyDeclaration) {
                    childrenArrayExpression = childrenPropertyDeclaration.value as t.ArrayExpression;
                }

                if (!childrenArrayExpression) {
                    const newChildrenPropertyDeclaration: t.ObjectProperty = t.objectProperty(
                        t.identifier('children'),
                        t.arrayExpression([]),
                    );
                    childrenArrayExpression = newChildrenPropertyDeclaration.value as t.ArrayExpression;
                    matchedRouteConfigExpression.properties.push(newChildrenPropertyDeclaration);
                }

                return traverseObjectExpression(pathname.split('/').slice(1).join('/'), childrenArrayExpression);
            } else {
                arrayExpression.elements.push(
                    t.objectExpression([
                        ...createRoutePathProperties(pathname),
                    ]),
                );
                return;
            }
        };

        traverseObjectExpression(pathname, routesPropertyDeclaration.value);

        result.push({
            line: decorator.loc?.start.line,
            content: (await generateDecoratorCode(decorator)).split(/\r|\n|\r\n/),
            deleteLines: decorator.loc?.end.line - decorator.loc?.start.line + 1,
        });

        return result;
    },
    (source, target) => ['component', 'module'].indexOf(source.collectionType) !== -1 && target.collectionType === 'module',
);
