import {
    detectExports,
    detectDecorators,
    getCollectionType,
    getFileEntityIdentifier,
    getPathDescriptorWithAlias,
    matchAlias,
    detectNamedImports,
} from '@agros/common';
import {
    ensureImport,
    EnsureImportOptions,
} from '@agros/utils/lib/ensure-import';
import { parseAST } from '@agros/utils/lib/parse-ast';
import { PlatformLoader } from '@agros/utils/lib/platform-loader';
import { ParseResult } from '@babel/parser';
import {
    CallExpression as BabelCallExpression,
    Identifier,
    CallExpression,
    Decorator,
    File,
    ObjectExpression,
    ObjectProperty,
    Statement,
    ExpressionStatement,
} from '@babel/types';
import * as path from 'path';
import generate from '@babel/generator';
import { createLoaderAOP } from './utils';
import * as t from '@babel/types';
import template from '@babel/template';
import _ from 'lodash';
import qs from 'qs';
import { ProjectConfigParser } from '@agros/config';
import { Platform } from '@agros/platforms/lib/platform.interface';

export const checkModule = createLoaderAOP(
    ({
        tree,
        context,
        modulesPath,
    }) => {
        const declaredClasses = detectExports<t.ClassDeclaration>(tree, 'ClassDeclaration');
        const moduleName = getFileEntityIdentifier(context.resourcePath);
        const dirname = path.basename(path.dirname(context.resourcePath));

        if (path.dirname(context.resourcePath).startsWith(modulesPath) && moduleName !== dirname) {
            throw new Error(`Module file '${path.basename(context.resourcePath)}' should match its directory name '${dirname}'`);
        }

        if (declaredClasses.length > 1) {
            throw new Error('Module files should have only one named class export');
        } else if (declaredClasses.length === 0) {
            throw new Error('A module file should have one named class export');
        }

        const decorators = detectDecorators(tree, 'Module');

        if (decorators.length === 0) {
            throw new Error('A module class should call `Module` function as decorator');
        } else if (decorators.length > 1) {
            throw new Error('A module should only call `Module` function once');
        }
    },
    ({ context }) => getCollectionType(context.resourcePath) === 'module',
);

export const checkService = createLoaderAOP(
    ({ tree }) => {
        const declaredClasses = detectExports<t.ClassDeclaration>(tree, 'ClassDeclaration');

        if (declaredClasses.length > 1) {
            throw new Error('Service files should have only one named class export');
        } else if (declaredClasses.length === 0) {
            throw new Error('A service file should have one named class export');
        }

        const decorators = detectDecorators(tree, 'Injectable');

        if (decorators.length === 0) {
            throw new Error('A service class should call `Injectable` function as decorator');
        } else if (decorators.length > 1) {
            throw new Error('A service should only call `Injectable` function once');
        }
    },
    ({ context }) => getCollectionType(context.resourcePath) === 'service',
);

export const transformEntry = createLoaderAOP<ParseResult<File>>(
    ({ tree }) => {
        let exportDefaultDeclarationIndex: number;
        let lastImportDeclarationIndex: number;
        const ensureIdentifierNameMap: Record<string, string> = {};
        const configParser = new ProjectConfigParser();
        const platformName = configParser.getConfig<string>('platform');
        const platformLoader = new PlatformLoader(platformName);
        const platform = platformLoader.getPlatform<Platform>();

        const [exportDefaultDeclaration] = detectExports<t.ArrayExpression>(tree, 'ArrayExpression');

        if (!exportDefaultDeclaration) {
            throw new Error('The entry of an project should export an array of config');
        }

        const imports = [
            {
                libName: `${platformName}/lib/platform`,
                identifierName: 'platform',
                type: 'default',
            } as Omit<EnsureImportOptions, 'statements'>,
        ].concat(platform.getLoaderImports());

        for (const importItem of imports) {
            const {
                statements,
                identifierName: ensuredIdentifierName,
            } = ensureImport({
                statements: tree.program.body,
                ...importItem,
            });

            tree.program.body = statements;
            ensureIdentifierNameMap[importItem.identifierName] = ensuredIdentifierName;
        }

        const bootstrapDeclarationStr = platform.getBootstrapCode(ensureIdentifierNameMap);

        for (const [index, statement] of tree.program.body.entries()) {
            if (statement.type === 'ImportDeclaration') {
                lastImportDeclarationIndex = index;
            }
            if (statement.type === 'ExportDefaultDeclaration') {
                exportDefaultDeclarationIndex = index;
            }
        }

        const bootstrapDeclarations = parseAST(bootstrapDeclarationStr).program.body;

        tree.program.body.splice(
            lastImportDeclarationIndex + 1,
            0,
            ...bootstrapDeclarations,
        );
        tree.program.body.splice(exportDefaultDeclarationIndex + bootstrapDeclarations.length, 1);
        tree.program.body.push(...parseAST('bootstrap(' + generate(exportDefaultDeclaration.declaration).code + ');').program.body);

        return tree;
    },
    ({
        srcPath,
        context,
    }) => {
        const absolutePath = context.resourcePath;
        return path.dirname(absolutePath) === srcPath && path.basename(absolutePath) === 'index.ts';
    },
);

export const transformComponentDecorator = createLoaderAOP(
    ({
        context,
        tree,
    }) => {
        const ensureIdentifierNameMap: Record<string, string> = {};
        const declaredClasses = detectExports<t.ClassDeclaration>(tree, 'ClassDeclaration');
        const configParser = new ProjectConfigParser();
        const platformLoader = new PlatformLoader(configParser.getConfig<string>('platform'));
        const platform = platformLoader.getPlatform<Platform>();

        if (declaredClasses.length > 1) {
            throw new Error('Component files should have only one named class export');
        } else if (declaredClasses.length === 0) {
            throw new Error('A component file should have one named class export');
        }

        const [exportedClassInfo] = declaredClasses;
        const componentClassDeclaration = exportedClassInfo.declaration;
        const [decorator] = detectDecorators(tree, 'Component');
        const [importedComponentDecoratorSpecifier] = detectNamedImports(
            tree,
            'Component',
            (source) => source.indexOf('@agros/app') !== -1,
        );

        if (!importedComponentDecoratorSpecifier) {
            throw new Error('A component file should import decorator `Component`');
        }

        const componentDecoratorName = importedComponentDecoratorSpecifier.local.name;
        const componentDecoratorIndex = componentClassDeclaration.decorators?.findIndex((decorator) => {
            return decorator.expression.type === 'CallExpression' &&
                decorator.expression.callee.type === 'Identifier' &&
                componentDecoratorName === ((decorator.expression as BabelCallExpression).callee as Identifier).name;
        });

        if (componentDecoratorIndex === -1) {
            throw new Error('A component file should be decorated with decorator `@Component`');
        }

        const decoratorArgument: ObjectExpression = (decorator.expression as CallExpression).arguments[0] as ObjectExpression;
        const componentMetadataConfig = ['file', 'lazy', 'styles'].reduce((result, key) => {
            const rawValue = (decoratorArgument.properties.find((property: ObjectProperty) => {
                return property.key.type === 'Identifier' && property.key.name === key;
            }) as ObjectProperty)?.value;

            if (rawValue) {
                if (key === 'file' && rawValue.type === 'StringLiteral') {
                    result['file'] = rawValue.value;
                } else if (key === 'lazy' && rawValue.type === 'BooleanLiteral') {
                    result['lazy'] = rawValue.value;
                } else if (key === 'styles' && rawValue.type === 'ArrayExpression') {
                    result['styles'] = [];
                    for (const item of rawValue.elements) {
                        if (item.type === 'StringLiteral') {
                            result['styles'].push(item.value);
                        }
                    }
                }
            }

            return result;
        }, {} as Partial<{
            file?: string;
            lazy?: boolean;
            styles?: string[];
        }>);

        const basename = path.basename(context.resourcePath);

        if (!componentMetadataConfig.file) {
            componentMetadataConfig.file = './' + _.startCase(basename).split(/\s+/).join('');
        }

        const styles = (componentMetadataConfig.styles || [])
            .filter((styleUrl) => typeof styleUrl === 'string')
            .map((styleUrl) => {
                if (matchAlias(styleUrl)) {
                    return getPathDescriptorWithAlias(styleUrl)?.absolutePath;
                } else {
                    return getPathDescriptorWithAlias(path.resolve(
                        path.dirname(context.resourcePath),
                        styleUrl,
                    ))?.absolutePath;
                }
            })
            .filter((styleUrl) => !!styleUrl);

        componentMetadataConfig.file = componentMetadataConfig.file + '?' + qs.stringify({
            component: true,
            ...(
                (componentMetadataConfig.styles || []).length > 0
                    ? {
                        styles: styles.map((styleUrl) => encodeURI(styleUrl)).join(','),
                    }
                    : {}
            ),
        });

        const imports = platform.getDecoratorImports();

        for (const importItem of imports) {
            const {
                statements,
                identifierName: ensuredIdentifierName,
            } = ensureImport({
                statements: tree.program.body,
                ...importItem,
            });
            tree.program.body = statements;
            ensureIdentifierNameMap[importItem.identifierName] = ensuredIdentifierName;
        }

        const componentFactoryStr = platform.getComponentDecoratorCode(ensureIdentifierNameMap);
        const componentFactoryDeclarations = parseAST(componentFactoryStr).program.body;
        const legacyDecorator: Decorator = _.clone(componentClassDeclaration?.decorators[componentDecoratorIndex]);
        const {
            lazy,
            file,
        } = componentMetadataConfig;
        const {
            importCodeLines = [],
            factoryCode = '',
        } = platform.getComponentFactoryCode(file, lazy);

        componentClassDeclaration?.decorators?.splice(
            componentDecoratorIndex,
            1,
            t.decorator(
                t.callExpression(
                    t.identifier('Agros$$ComponentWithFactory'),
                    [
                        t.objectExpression([
                            t.objectProperty(
                                t.stringLiteral('factory'),
                                (template.ast(factoryCode) as ExpressionStatement).expression,
                            ),
                            ...(((legacyDecorator.expression as CallExpression)?.arguments[0] as ObjectExpression).properties || []).filter((property: ObjectProperty) => {
                                return property.key.type === 'Identifier' && [
                                    'file',
                                    'lazy',
                                    'styles',
                                ].indexOf(property.key.name) === -1;
                            }),
                        ]),
                    ],
                ),
            ),
        );

        let lastImportDeclarationIndex: number;

        for (const [index, statement] of tree.program.body.entries()) {
            if (statement.type === 'ImportDeclaration') {
                lastImportDeclarationIndex = index;
            }
        }

        const {
            exportMode,
            exportIndex,
        } = exportedClassInfo;

        const addedDeclarations = [
            ...importCodeLines.map((importCodeLine) => {
                try {
                    return template.ast(importCodeLine) as Statement;
                } catch (e) {
                    return null;
                }
            }).filter((ast) => !!ast),
            ...componentFactoryDeclarations,
        ];
        if (lastImportDeclarationIndex) {
            tree.program.body.splice(lastImportDeclarationIndex + 1, 0, ...addedDeclarations);
        }

        if (exportMode === 'default' || exportMode === 'named') {
            if (!componentClassDeclaration.id) {
                componentClassDeclaration.id = t.identifier('Agros$TemporaryComponentClass');
            }
            tree.program.body.splice(exportIndex + addedDeclarations.length + 1, 1, componentClassDeclaration);
        }

        if (exportMode === 'named') {
            tree.program.body.push(template.ast(`export { ${componentClassDeclaration.id.name} }`) as Statement);
        }

        if (exportMode === 'default') {
            tree.program.body.push(template.ast(`export default ${componentClassDeclaration.id.name}`) as Statement);
        }

        return tree;
    },
    ({ context }) => getCollectionType(context.resourcePath) === 'component',
);

export const transformComponentFile = createLoaderAOP(
    ({
        tree,
        parsedQuery,
    }) => {
        const styleUrls = (parsedQuery.styles as string || '')
            .split(',')
            .filter((styleUrl) => !!styleUrl)
            .map((styleUrl) => decodeURI(styleUrl));

        for (const styleUrl of styleUrls) {
            tree.program.body.unshift(t.importDeclaration([], t.stringLiteral(styleUrl)));
        }

        return tree;
    },
    ({ parsedQuery }) => parsedQuery.component && parsedQuery.component === 'true',
);
