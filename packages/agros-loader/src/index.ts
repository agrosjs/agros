/* eslint-disable @typescript-eslint/no-invalid-this */
import * as path from 'path';
import * as fs from 'fs';
import { ProjectConfigParser } from '@agros/config';
import {
    ensureImport,
    EnsureImportOptions,
    parseAST,
} from '@agros/utils';
import {
    CallExpression,
    ExportDefaultDeclaration,
    ObjectExpression,
    ObjectProperty,
    Statement,
    Decorator,
} from '@babel/types';
import * as t from '@babel/types';
import ejs from 'ejs';
import generate from '@babel/generator';
import _ from 'lodash';
import qs from 'qs';
import template from '@babel/template';
import {
    getCollectionType,
    detectClassExports,
} from '@agros/common';
import { matchAlias } from '@agros/common';

const configParser = new ProjectConfigParser();

const transformEntry = (ast: ReturnType<typeof parseAST>): string => {
    const tree = _.clone(ast);
    let exportDefaultDeclaration: ExportDefaultDeclaration;
    let exportDefaultDeclarationIndex: number;
    let lastImportDeclarationIndex: number;
    const ensureIdentifierNameMap = {};

    for (const statement of tree.program.body) {
        if (
            statement.type === 'ExportDefaultDeclaration' &&
                statement.declaration.type === 'ArrayExpression'
        ) {
            exportDefaultDeclaration = statement as ExportDefaultDeclaration;
        }
    }

    if (!exportDefaultDeclaration) {
        throw new Error('The entry of an Agros project should export an array of config as default');
    }

    const imports = [
        {
            libName: '@agros/app/lib/router',
            identifierName: 'Routes',
        },
        {
            libName: '@agros/app/lib/router',
            identifierName: 'Route',
        },
        {
            libName: '@agros/app/lib/router',
            identifierName: 'BrowserRouter',
        },
        {
            libName: '@agros/app/lib/factory',
            identifierName: 'Factory',
        },
        {
            libName: '@agros/app',
            identifierName: 'useEffect',
        },
        {
            libName: '@agros/app',
            identifierName: 'useState',
        },
        {
            libName: '@agros/app',
            identifierName: 'createElement',
        },
        {
            libName: '@agros/app',
            identifierName: 'render',
        },
        {
            libName: '@agros/app',
            identifierName: 'Suspense',
        },
    ] as Omit<EnsureImportOptions, 'statements'>[];

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

    const bootstrapDeclarationTemplate = fs.readFileSync(path.resolve(__dirname, '../templates/bootstrap.js.template')).toString();
    const bootstrapDeclarationStr = ejs.render(bootstrapDeclarationTemplate, {
        map: ensureIdentifierNameMap,
    });

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

    tree.program.body.push(
        ...parseAST(
            'bootstrap(' +
            generate(exportDefaultDeclaration.declaration).code +
            ');',
        ).program.body,
    );

    return generate(tree).code;
};

const transformComponentDecorator = (absolutePath: string, ast: ReturnType<typeof parseAST>) => {
    const tree = _.clone(ast);
    const ensureIdentifierNameMap = {};
    const declaredClasses = detectClassExports(tree);

    if (declaredClasses.length > 1) {
        throw new Error('Component files should have only one named class export');
    } else if (declaredClasses.length === 0) {
        throw new Error('A component file should have one named class export');
    }

    const [exportedClassInfo] = declaredClasses;
    const componentClassDeclaration = exportedClassInfo.declaration;
    const decorators = componentClassDeclaration.decorators?.filter((decorator) => {
        return decorator.expression.type === 'CallExpression' && decorator.expression.arguments[0]?.type === 'ObjectExpression';
    });

    if (componentClassDeclaration.decorators?.length !== 1) {
        throw new Error('A component declaration should have one decorator');
    }

    const decoratorArgument: ObjectExpression = (decorators[0].expression as CallExpression).arguments[0] as ObjectExpression;
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

    const basename = path.basename(absolutePath);

    if (!componentMetadataConfig.file) {
        componentMetadataConfig.file = './' + _.startCase(basename).split(/\s+/).join('');
    }

    const styles = (componentMetadataConfig.styles || [])
        .filter((styleUrl) => typeof styleUrl === 'string')
        .map((styleUrl) => {
            if (matchAlias(styleUrl)) {
                return styleUrl;
            } else {
                return path.resolve(path.dirname(absolutePath), styleUrl);
            }
        });

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

    const imports = [
        {
            libName: '@agros/app/lib/constants',
            identifierName: 'DI_METADATA_COMPONENT_SYMBOL',
        },
        {
            libName: '@agros/app/lib/constants',
            identifierName: 'DI_DEPS_SYMBOL',
        },
        {
            libName: '@agros/app',
            identifierName: 'lazy',
        },
    ] as Omit<EnsureImportOptions, 'statements'>[];

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

    const componentFactoryStr = fs.readFileSync(
        path.resolve(
            __dirname,
            '../templates/component.decorator.ts.template',
        ),
    ).toString();

    const componentIdentifierName = 'Agros$$CurrentComponent';
    const forwardRefIdentifierName = 'Agros$$forwardRef';

    const componentFileImportDeclaration = componentMetadataConfig.lazy
        ? null
        : template.ast(`import ${componentIdentifierName} from '${componentMetadataConfig.file}';`) as Statement;

    const componentFactoryDeclarations = parseAST(ejs.render(componentFactoryStr, {
        map: ensureIdentifierNameMap,
    })).program.body;

    const legacyDecorator: Decorator = _.clone(componentClassDeclaration?.decorators[0]);
    componentClassDeclaration?.decorators?.splice(
        0,
        1,
        t.decorator(
            t.callExpression(
                t.identifier('Agros$$ComponentWithFactory'),
                [
                    t.objectExpression([
                        t.objectProperty(
                            t.stringLiteral('factory'),
                            t.arrowFunctionExpression(
                                [t.identifier(forwardRefIdentifierName)],
                                componentMetadataConfig.lazy
                                    ? t.callExpression(
                                        t.identifier(ensureIdentifierNameMap['lazy']),
                                        [
                                            t.arrowFunctionExpression(
                                                [],
                                                t.callExpression(
                                                    t.identifier(forwardRefIdentifierName),
                                                    [
                                                        t.callExpression(
                                                            t.identifier('import'),
                                                            [
                                                                t.stringLiteral(componentMetadataConfig.file),
                                                            ],
                                                        ),
                                                    ],
                                                ),
                                            ),
                                        ],
                                    )
                                    : t.identifier(componentIdentifierName),
                            ),
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
        ...(componentFileImportDeclaration ? [componentFileImportDeclaration] : []),
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

    return generate(tree).code;
};

const transformComponentFile = (ast: ReturnType<typeof parseAST>, parsedQuery: Record<string, any> = {}): string => {
    const tree = _.clone(ast);

    if (!parsedQuery.component || parsedQuery.component !== 'true') {
        return generate(tree).code;
    }

    const styleUrls = (parsedQuery.styles as string || '')
        .split(',')
        .filter((styleUrl) => !!styleUrl)
        .map((styleUrl) => decodeURI(styleUrl));

    for (const styleUrl of styleUrls) {
        tree.program.body.unshift(t.importDeclaration([], t.stringLiteral(styleUrl)));
    }

    return generate(tree).code;
};

export default function(source) {
    const resourceAbsolutePath = this.resourcePath;

    if (!resourceAbsolutePath) {
        return source;
    }

    const srcAbsolutePath = path.resolve(
        process.cwd(),
        configParser.getConfig('baseDir'),
    );

    if (path.dirname(resourceAbsolutePath) === srcAbsolutePath && path.basename(resourceAbsolutePath) === 'index.ts') {
        try {
            const newSource = transformEntry(parseAST(source));
            if (newSource) {
                return newSource;
            }
        } catch (e) {
            this.emitError(e);
        }
    }

    if (getCollectionType(resourceAbsolutePath) === 'component') {
        try {
            const newSource = transformComponentDecorator(resourceAbsolutePath, parseAST(source));
            if (newSource) {
                return newSource;
            }
        } catch (e) {
            this.emitError(e);
        }
    }

    const parsedQuery = qs.parse((this.resourceQuery || '').replace(/^\?/, '')) || {};

    if (parsedQuery.component && parsedQuery.component === 'true') {
        try {
            const newSource = transformComponentFile(parseAST(source), parsedQuery);
            if (newSource) {
                return newSource;
            }
        } catch (e) {
            this.emitError(e);
        }
    }

    return source;
}
