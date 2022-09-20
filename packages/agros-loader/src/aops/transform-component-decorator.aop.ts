import { ensureImport } from '@agros/tools/lib/ensure-import';
import { parseAST } from '@agros/tools/lib/parse-ast';
import {
    PlatformConfigParser,
    ProjectConfigParser,
} from '@agros/tools/lib/config-parsers';
import {
    CallExpression as BabelCallExpression,
    Identifier,
    CallExpression,
    Decorator,
    ObjectExpression,
    ObjectProperty,
    Statement,
    ExpressionStatement,
} from '@babel/types';
import * as path from 'path';
import {
    createAddVirtualFile,
    createLoaderAOP,
} from '../utils';
import * as t from '@babel/types';
import template from '@babel/template';
import _ from 'lodash';
import qs from 'qs';
import {
    Platform,
    FactoryCode,
} from '@agros/tools/lib/platform.interface';
import generate from '@babel/generator';
import { v4 as uuidV4 } from 'uuid';
import {
    detectDecorators,
    detectExports,
    detectNamedImports,
} from '@agros/tools/lib/detectors';
import {
    getCollectionType,
    getPathDescriptorWithAlias,
    matchAlias,
} from '@agros/tools/lib/utils';

export const transformComponentDecorator = createLoaderAOP(
    async ({
        context,
        tree,
        factoryFilename,
    }) => {
        const addVirtualFile = createAddVirtualFile(context);
        const uuid = uuidV4();
        const ensureIdentifierNameMap: Record<string, string> = {};
        const declaredClasses = detectExports<t.ClassDeclaration>(tree, 'ClassDeclaration');
        const configParser = new ProjectConfigParser();
        const platform = new PlatformConfigParser(configParser.getConfig<string>('platform')).getPlatform<Platform>();

        if (declaredClasses.length > 1) {
            throw new Error('Component files should have only one named class export');
        } else if (declaredClasses.length === 0) {
            throw new Error('A component file should have one named class export');
        }

        const [exportedClassInfo] = declaredClasses;
        const exportDeclaration = tree.program.body[exportedClassInfo.exportIndex];
        const componentClassDeclaration = exportedClassInfo.declaration;
        const [decorator] = detectDecorators(tree, 'Component');
        const [importedComponentDecoratorSpecifier] = detectNamedImports(
            tree,
            'Component',
            (source) => source.indexOf('@agros/common') !== -1,
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
        }, {
            uuid,
        } as {
            uuid: string;
            file?: string;
            lazy?: boolean;
            styles?: string[];
        });

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
            component_uuid: uuid,
            ...(
                (componentMetadataConfig.styles || []).length > 0
                    ? {
                        styles: styles.map((styleUrl) => encodeURI(styleUrl)).join(','),
                    }
                    : {}
            ),
        });

        const imports = [
            {
                libName: '@agros/common',
                identifierName: 'DI_METADATA_COMPONENT_SYMBOL',
            },
            {
                libName: '@agros/common',
                identifierName: 'DI_DEPS_SYMBOL',
            },
        ].concat(platform.getDecoratorImports());

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

        const componentDecoratorFactoryName = 'Agros$$ComponentWithFactory';
        const componentFactoryStr = `
            const ${componentDecoratorFactoryName} = (options) => {
                const {
                    declarations = [],
                    ...metadataValue
                } = options;
                return (target) => {
                    Reflect.defineMetadata(
                        ${ensureIdentifierNameMap['DI_METADATA_COMPONENT_SYMBOL']},
                        metadataValue,
                        target,
                    );
                    Reflect.defineMetadata(${ensureIdentifierNameMap['DI_DEPS_SYMBOL']}, declarations, target);
                };
            }
        `;
        const componentFactoryDeclarations = parseAST(componentFactoryStr).program.body;
        const legacyDecorator: Decorator = _.clone(componentClassDeclaration?.decorators[componentDecoratorIndex]);
        const {
            lazy,
            file: filePath,
        } = componentMetadataConfig;
        const componentIdentifierName = 'Agros$$CurrentComponent';
        const factoryCodeConfig = platform.getComponentFactoryCode({
            ensuredImportsMap: ensureIdentifierNameMap,
            filePath,
            componentIdentifierName,
            lazy,
            componentUuid: uuid,
            absoluteFilePath: path.resolve(context.context, filePath),
            factoryPath: path.resolve('src', factoryFilename),
            addVirtualFile,
        });
        const factoryCode = typeof factoryCodeConfig === 'string'
            ? factoryCodeConfig
            : (factoryCodeConfig as FactoryCode).code;
        const importCodeLines = lazy
            ? []
            : [`const ${componentIdentifierName} = import('${filePath}');`];
        const codeModifier = typeof factoryCodeConfig !== 'string'
            ? (factoryCodeConfig as FactoryCode).modifier
            : null;

        componentClassDeclaration?.decorators?.splice(
            componentDecoratorIndex,
            1,
            t.decorator(
                t.callExpression(
                    t.identifier(componentDecoratorFactoryName),
                    [
                        t.objectExpression([
                            t.objectProperty(
                                t.identifier('factory'),
                                (template.ast(factoryCode) as ExpressionStatement).expression,
                            ),
                            t.objectProperty(
                                t.identifier('uuid'),
                                t.stringLiteral(uuid),
                            ),
                            ...(((legacyDecorator.expression as CallExpression)?.arguments[0] as ObjectExpression).properties || []).filter((property: ObjectProperty) => {
                                return property.key.type === 'Identifier' && [
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
                    const importCodeAST = template.ast(importCodeLine) as Statement;
                    return importCodeAST;
                } catch (e) {
                    return null;
                }
            }).filter((ast) => !!ast),
            ...componentFactoryDeclarations,
        ];
        tree.program.body.splice(
            lastImportDeclarationIndex > 0
                ? lastImportDeclarationIndex + 1
                : 0,
            0,
            ...addedDeclarations,
        );

        if (exportMode === 'default' || exportMode === 'named') {
            if (!componentClassDeclaration.id) {
                componentClassDeclaration.id = t.identifier('Agros$TemporaryComponentClass');
            }
            tree.program.body.splice(lastImportDeclarationIndex + exportIndex + addedDeclarations.length + 1, 0, componentClassDeclaration);
            tree.program.body = tree.program.body.filter((item) => item !== exportDeclaration);
        }

        if (exportMode === 'named') {
            tree.program.body.push(template.ast(`export { ${componentClassDeclaration.id.name} }`) as Statement);
        }

        if (exportMode === 'default') {
            tree.program.body.push(template.ast(`export default ${componentClassDeclaration.id.name}`) as Statement);
        }

        let code = generate(tree).code;

        if (typeof codeModifier === 'function') {
            code = codeModifier(code);
        }

        return code;
    },
    async ({ context }) => getCollectionType(context.resourcePath) === 'component',
);
