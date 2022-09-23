import { parseAST } from './parse-ast';
import { ParseResult } from '@babel/parser';
import {
    CallExpression as BabelCallExpression,
    ExportSpecifier,
    File,
    Identifier,
    ImportDeclaration,
    ImportSpecifier,
    Decorator as BabelDecorator,
    ObjectExpression,
    ObjectProperty,
    Node,
    Statement,
    ClassDeclaration,
    Expression,
    StringLiteral,
} from '@babel/types';
import * as fs from 'fs-extra';
import {
    transformAliasedPathToPath,
    transformPathToAliasedPath,
} from './transformers';
import {
    getCollectionType,
    getEntityDescriptorWithAlias,
    getFileEntityIdentifier,
    matchAlias,
} from './utils';
import * as path from 'path';
import {
    normalizeAbsolutePath,
    normalizeNoExtensionPath,
    normalizeSrcPath,
} from './normalizers';
import _ from 'lodash';
import { lintCode } from './linters';
import { RootPointDescriptor } from './types';
import { ProjectConfigParser } from './config-parsers';
import traverse from '@babel/traverse';

export type ExportMode = 'default' | 'named' | 'namedIdentifier' | 'defaultIdentifier';
export interface ExportItem<T = Statement | Expression> {
    declaration: T;
    exportMode: ExportMode;
    exportIndex: number;
    declarationIndex: number;
    localName?: string;
    exportedName?: string;
}

export interface ImportedItem {
    localName: string;
    exportName: string;
    source: string;
}

interface CallExpression extends BabelCallExpression {
    callee: Identifier;
}

export interface Decorator extends BabelDecorator {
    expression: CallExpression;
}

export const detectExports = <T extends Statement | Expression>(ast: ParseResult<File>, type: Node['type']): ExportItem<T>[] => {
    const result = [] as ExportItem<T>[];
    const exportedIdentifiers = [] as Array<[Identifier, Identifier, number]>;

    if (!type) {
        return result;
    }

    for (const [index, statement] of ast.program.body.entries()) {
        if (statement.type === 'ExportDefaultDeclaration') {
            if (statement.declaration.type === type) {
                result.push({
                    declaration: statement.declaration as T,
                    exportMode: 'default',
                    exportIndex: index,
                    declarationIndex: index,
                });
            } else if (statement.declaration.type === 'Identifier') {
                const exportedDefaultDeclarationIndex = ast.program.body.findIndex((currentStatement) => {
                    return currentStatement.type === type &&
                        (currentStatement as any)?.id.name === (statement.declaration as Identifier).name;
                });

                if (exportedDefaultDeclarationIndex !== -1) {
                    result.push({
                        declaration: ast.program.body[exportedDefaultDeclarationIndex] as T,
                        exportMode: 'defaultIdentifier',
                        localName: statement.declaration.name,
                        exportIndex: index,
                        declarationIndex: exportedDefaultDeclarationIndex,
                    });
                }
            }
        } else if (statement.type === 'ExportNamedDeclaration') {
            if (statement?.declaration?.type === type) {
                const declaration = statement.declaration as any;
                result.push({
                    declaration,
                    exportMode: 'named',
                    localName: declaration.id.name,
                    exportedName: declaration.id.name,
                    exportIndex: index,
                    declarationIndex: index,
                });
            }

            if (statement?.specifiers.length > 0) {
                for (const specifier of statement.specifiers) {
                    if (specifier.exported.type === 'Identifier') {
                        exportedIdentifiers.push([
                            (specifier as ExportSpecifier).local,
                            (specifier as ExportSpecifier).exported as Identifier,
                            index,
                        ]);
                    }
                }
            }
        }
    }

    for (const [localIdentifier, exportedIdentifier, exportIndex] of exportedIdentifiers) {
        const identifiedDeclarationIndex = ast.program.body.findIndex((statement) => {
            return statement.type === type && (statement as any)?.id.name === exportedIdentifier.name;
        });

        if (identifiedDeclarationIndex !== -1) {
            result.push({
                declaration: ast.program.body[identifiedDeclarationIndex] as T,
                exportMode: 'namedIdentifier',
                localName: localIdentifier.name,
                exportedName: exportedIdentifier.name,
                exportIndex,
                declarationIndex: identifiedDeclarationIndex,
            });
        }
    }

    return result;
};

export const detectNamedImports = (
    ast: ParseResult<File>,
    name: string,
    sourceNameFilter: (sourceName: string) => boolean = () => true,
): ImportSpecifier[] => {
    return ast.program.body.filter((statement) => {
        return statement.type === 'ImportDeclaration' && sourceNameFilter(statement.source.value);
    }).reduce((result, declaration: ImportDeclaration) => {
        const specifiers: ImportSpecifier[] = (declaration.specifiers || []).filter((specifier) => {
            return specifier.type === 'ImportSpecifier' &&
                specifier.imported.type === 'Identifier' &&
                specifier.imported.name === name;
        }) as ImportSpecifier[];
        return result.concat(specifiers);
    }, [] as ImportSpecifier[]);
};

export type ImportSpecifierMap = Record<string, string>;

export const detectImportSpecifierMap = (ast: ParseResult<File>): ImportSpecifierMap => {
    const result: ImportSpecifierMap = {};

    traverse(
        ast,
        {
            ImportDeclaration(path) {
                const node = path.node;
                for (const specifier of node.specifiers) {
                    const pathname = transformAliasedPathToPath(node.source.value);
                    if (!pathname) {
                        continue;
                    }
                    result[specifier.local.name] = pathname;
                }
            },
            CallExpression(path) {
                if (
                    path.node.callee.type === 'Import' &&
                    path.parent.type === 'VariableDeclarator' &&
                    path.parent.id.type === 'Identifier' &&
                    path.node.arguments[0].type === 'StringLiteral'
                ) {
                    const pathname = transformAliasedPathToPath(path.node.arguments[0].value);
                    if (pathname) {
                        result[path.parent.id.name] = pathname;
                    }
                }
            },
        },
    );

    return result;
};

export const detectDecorators = (tree: ParseResult<File>, name: string) => {
    const [exportedClass] = detectExports<ClassDeclaration>(tree, 'ClassDeclaration');
    const decoratorImports = detectNamedImports(
        tree,
        name,
        (source) => source.indexOf('@agros/common') !== -1,
    );

    const decorators = (exportedClass.declaration?.decorators || []).filter((decorator) => {
        return decorator.expression.type === 'CallExpression' &&
            decorator.expression.callee.type === 'Identifier' &&
            decoratorImports.some((specifier) => {
                return specifier.local.name === ((decorator.expression as BabelCallExpression).callee as Identifier).name;
            });
    });

    return decorators as Decorator[];
};

export interface ClassImportItem<T extends Statement> {
    imported: boolean;
    exportItem: ExportItem<T>;
    identifierName: string;
    sourceLiteralValue?: string;
    importLiteralValue?: string;
}

const getPath = (targetPath, statementSource) => {
    return matchAlias(statementSource)
        ? transformAliasedPathToPath(statementSource)
        : path.resolve(path.dirname(targetPath), statementSource);
};

export const detectImportedClass = async (
    sourcePath: string,
    targetPath: string,
    dynamic = false,
): Promise<ClassImportItem<ClassDeclaration>> => {
    const result: ClassImportItem<ClassDeclaration> = {
        imported: false,
        exportItem: null,
        identifierName: null,
    };

    if (!fs.existsSync(sourcePath) || !fs.existsSync(targetPath)) {
        return result;
    }

    const sourceAST = parseAST(fs.readFileSync(sourcePath).toString());
    const targetAST = parseAST(fs.readFileSync(targetPath).toString());

    const [exportedClassItem] = detectExports<ClassDeclaration>(sourceAST, 'ClassDeclaration');
    const {
        exportMode,
        exportedName,
    } = exportedClassItem;
    result.exportItem = exportedClassItem;

    if (!exportedClassItem) {
        return result;
    }

    const dynamicImportDeclarations = await new Promise<CallExpression[]>((resolve) => {
        const expressions: CallExpression[] = [];
        traverse(_.cloneDeep(targetAST) as any, {
            CallExpression: (path) => {
                if (
                    path.node.type === 'CallExpression' &&
                        path.node.callee.type === 'Import' &&
                        path.node.arguments[0].type === 'StringLiteral' &&
                        getPath(targetPath, path.node.arguments[0].value) === normalizeNoExtensionPath(sourcePath)
                ) {
                    expressions.push(path.node as CallExpression);
                }
            },
            Program: {
                exit: () => {
                    resolve(expressions);
                },
            },
        });
    });

    if (dynamicImportDeclarations.length > 0) {
        result.imported = true;
        result.identifierName = exportedName;
        return result;
    }

    for (const statement of targetAST.program.body) {
        if (statement.type !== 'ImportDeclaration') {
            continue;
        }

        const statementSource = statement.source.value;
        const statementSourcePath = getPath(targetPath, statementSource);

        if (normalizeNoExtensionPath(sourcePath) !== statementSourcePath) {
            continue;
        }

        const specifiers = statement.specifiers;

        for (const specifier of specifiers) {
            switch (specifier.type) {
                case 'ImportDefaultSpecifier': {
                    if (exportMode === 'default' || exportMode === 'defaultIdentifier') {
                        result.identifierName = specifier.local.name;
                    }
                    result.imported = true;
                    break;
                }
                case 'ImportNamespaceSpecifier': {
                    const namespaceIdentifierName = specifier.local.name;
                    if (exportMode === 'default' || exportMode === 'defaultIdentifier') {
                        result.identifierName = namespaceIdentifierName;
                    } else if (exportedName) {
                        result.identifierName = `${namespaceIdentifierName}.${exportedName}`;
                    }
                    result.imported = true;
                    break;
                }
                case 'ImportSpecifier': {
                    if (specifier.imported.type === 'Identifier' && specifier.imported.name === exportedName) {
                        result.identifierName = specifier.local.name;
                    }
                    result.imported = true;
                    break;
                }
                default:
                    break;
            }
        }
    }

    if (!result.imported) {
        result.sourceLiteralValue = normalizeNoExtensionPath(transformPathToAliasedPath(sourcePath, path.dirname(targetPath)));
    }

    switch (exportMode) {
        case 'named':
        case 'namedIdentifier': {
            result.identifierName = exportedName;
            result.importLiteralValue = dynamic
                ? `const ${exportedName} = import('${result.sourceLiteralValue}').then(({${exportedName}}) => ${exportedName});`
                : `import { ${result.identifierName} } from '${result.sourceLiteralValue}';`;
            break;
        }
        case 'default':
        case 'defaultIdentifier': {
            result.identifierName = _.startCase(path.basename(normalizeNoExtensionPath(sourcePath))).split(/\s+/).join('');
            result.importLiteralValue = dynamic
                ? `const ${result.identifierName} = import('${result.sourceLiteralValue}');`
                : `import ${result.identifierName} from '${result.sourceLiteralValue}';`;
            break;
        }
        default:
            break;
    }

    if (result.importLiteralValue) {
        result.importLiteralValue = (await lintCode(result.importLiteralValue)).replace(/(\r|\n|\r\n)$/, '');
    }

    return result;
};

export const detectLastImportDeclaration = (ast: ParseResult<File>) => {
    let started = false;
    let lastImportDeclaration: ImportDeclaration;

    for (const statement of ast.program.body) {
        if (statement.type === 'ImportDeclaration') {
            if (!started) {
                started = true;
                lastImportDeclaration = statement;
            } else {
                break;
            }
        } else {
            continue;
        }
    }

    return lastImportDeclaration;
};

export const detectLastImportLine = (ast: ParseResult<File>) => {
    return (detectLastImportDeclaration(ast)?.loc?.end?.line || 0) + 1;
};

export const detectEOLCharacter = (code: string): string => {
    try {
        const crCount = code.split('\r').length;
        const lfCount = code.split('\n').length;
        const crlfCount = code.split('\r\n').length;

        if (crCount + lfCount === 0) {
            return '\n';
        }

        if (crlfCount === crCount && crlfCount === lfCount) {
            return '\r\n';
        }

        if (crCount > lfCount) {
            return '\r';
        } else {
            return '\n';
        }
    } catch (e) {
        return '\n';
    }
};

export const detectRootPoint = (): RootPointDescriptor => {
    const projectConfigParser = new ProjectConfigParser();
    const content = fs.readFileSync(
        path.resolve(
            normalizeSrcPath(),
            projectConfigParser.getConfig<string>('entry'),
        ),
    ).toString();
    const ast = parseAST(content);
    const body = ast.program.body;
    const [configDeclaration] = detectExports<ObjectExpression>(ast, 'ObjectExpression');

    if (!configDeclaration) {
        return null;
    }

    const moduleNames: string[] = ([configDeclaration.declaration] as ObjectExpression[] || [])
        .filter((element) => element.type === 'ObjectExpression')
        .map((element: ObjectExpression) => {
            const moduleProperty: ObjectProperty = (element?.properties || []).find((property: ObjectProperty) => {
                return (property.key as Identifier).name === 'module' || (property.key as StringLiteral).value === 'module';
            }) as ObjectProperty;

            if (moduleProperty) {
                return (moduleProperty.value as any).name;
            }

            return null;
        })
        .filter((moduleName) => !!moduleName);

    const [importedItem]: ImportedItem[] = body.filter((statement) => {
        return statement.type === 'ImportDeclaration';
    }).reduce((result, currentStatement: ImportDeclaration) => {
        return result.concat(currentStatement.specifiers.map((specifier) => {
            return {
                localName: specifier?.local?.name,
                source: currentStatement?.source?.value,
                exportName: (specifier as any)?.imported?.name,
            };
        }));
    }, [] as ImportedItem[]).filter((importedItem) => {
        return moduleNames.indexOf(importedItem.localName) !== -1;
    });

    const {
        source,
        localName,
        exportName,
    } = importedItem;

    const entityDescriptor = getEntityDescriptorWithAlias(
        normalizeAbsolutePath(transformAliasedPathToPath(source) + '.ts'),
    );

    if (!entityDescriptor) {
        return null;
    }

    const collectionType = getCollectionType(entityDescriptor.absolutePath);

    if (!collectionType) {
        return null;
    }

    const baseFilename = path.basename(entityDescriptor.absolutePath);
    const absoluteDirname = path.dirname(entityDescriptor.absolutePath);
    const relativeDirname = path.relative(normalizeSrcPath(), absoluteDirname);

    return {
        ...entityDescriptor,
        localName,
        collectionType,
        exportName,
        name: relativeDirname
            .split(path.sep)
            .concat(getFileEntityIdentifier(baseFilename))
            .filter((segment) => !!segment)
            .join('/'),
    };
};
