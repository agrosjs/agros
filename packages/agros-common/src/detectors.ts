import { parseAST } from '@agros/utils';
import { ParseResult } from '@babel/parser';
import {
    CallExpression as BabelCallExpression,
    ExportSpecifier,
    File,
    Identifier,
    ImportDeclaration,
    ImportSpecifier,
    Decorator as BabelDecorator,
    ExpressionStatement,
    ObjectExpression,
    ObjectProperty,
    Node,
    Statement,
    ClassDeclaration,
    Expression,
} from '@babel/types';
import * as fs from 'fs-extra';
import {
    transformAliasedPathToPath,
    transformPathToAliasedPath,
} from './transformers';
import {
    getCollectionType,
    getFileEntityIdentifier,
    getPathDescriptorWithAlias,
    matchAlias,
} from './utils';
import * as path from 'path';
import {
    normalizeNoExtensionPath,
    normalizeSrcPath,
} from './normalizers';
import _ from 'lodash';
import { lintCode } from './linters';
import { RootPointDescriptor } from './types';
import { ProjectConfigParser } from '@agros/config';

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

export const detectDecorators = (tree: ParseResult<File>, name: string) => {
    const [exportedClass] = detectExports<ClassDeclaration>(tree, 'ClassDeclaration');
    const decoratorImports = detectNamedImports(
        tree,
        name,
        (source) => source.indexOf('@agros/app') !== -1,
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

export const detectImportedClass = async (sourcePath: string, targetPath: string): Promise<ClassImportItem<ClassDeclaration>> => {
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

    for (const statement of targetAST.program.body) {
        if (statement.type !== 'ImportDeclaration') {
            continue;
        }

        const statementSource = statement.source.value;
        const statementSourcePath = matchAlias(statementSource)
            ? transformAliasedPathToPath(statementSource)
            : path.resolve(path.dirname(targetPath), statementSource);

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
            result.importLiteralValue = `import { ${result.identifierName} } from '${result.sourceLiteralValue}';`;
            break;
        }
        case 'default':
        case 'defaultIdentifier': {
            result.identifierName = _.startCase(path.basename(normalizeNoExtensionPath(sourcePath))).split(/\s+/).join('');
            result.importLiteralValue = `import ${result.identifierName} from '${result.sourceLiteralValue}';`;
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

export const detectLastImportLine = (ast: ParseResult<File>) => {
    let lastImportLine = 0;

    for (const statement of ast.program.body) {
        if (statement.type === 'ImportDeclaration') {
            lastImportLine = statement.loc?.end.line;
        } else {
            continue;
        }
    }

    return lastImportLine + 1;
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

export const detectRootPoints = (): RootPointDescriptor[] => {
    const projectConfigParser = new ProjectConfigParser();
    const content = fs.readFileSync(
        path.resolve(
            normalizeSrcPath(),
            projectConfigParser.getConfig<string>('entry'),
        ),
    ).toString();
    const body = parseAST(content).program.body;
    const appImportDeclaration: ImportDeclaration = body.find((statement) => {
        return statement.type === 'ImportDeclaration' &&
            statement.source.value.indexOf('@agros/app') !== -1;
    }) as ImportDeclaration;

    if (!appImportDeclaration) {
        return [];
    }

    let bootstrapFnLocalName: string;

    for (const specifier of (appImportDeclaration.specifiers || [])) {
        const currentSpecifier = specifier as any;
        if (!currentSpecifier.imported && specifier.local.name === 'bootstrap') {
            bootstrapFnLocalName = 'bootstrap';
            break;
        } else if (currentSpecifier.imported && currentSpecifier.imported.name === 'bootstrap') {
            bootstrapFnLocalName = specifier.local.name;
            break;
        }
    }

    if (!bootstrapFnLocalName) {
        return [];
    }

    const callerDeclaration: ExpressionStatement = body.find((statement) => {
        if (
            statement.type === 'ExpressionStatement' &&
            statement.expression.type === 'CallExpression' &&
            (statement.expression.callee as any).name === bootstrapFnLocalName
        ) {
            return true;
        }
        return false;
    }) as ExpressionStatement;

    const moduleNames: string[] = ((callerDeclaration.expression as any)?.arguments[0]?.elements as any[] || [])
        .filter((element) => element.type === 'ObjectExpression')
        .map((element: ObjectExpression) => {
            const moduleProperty: ObjectProperty = (element?.properties || [])
                .find((property: ObjectProperty) => {
                    return (property.key as any).name === 'module';
                }) as ObjectProperty;
            if (moduleProperty) {
                return (moduleProperty.value as any).name;
            }
            return null;
        })
        .filter((moduleName) => !!moduleName);

    const importedItems: ImportedItem[] = body.filter((statement) => {
        return statement.type === 'ImportDeclaration';
    }).reduce((result, currentStatement: ImportDeclaration) => {
        return result.concat(currentStatement.specifiers.map((specifier) => {
            return {
                localName: specifier.local.name,
                source: currentStatement.source.value,
                exportName: (specifier as any).imported.name,
            };
        }));
    }, [] as ImportedItem[]).filter((importedItem) => {
        return moduleNames.indexOf(importedItem.localName) !== -1;
    });

    return importedItems.map((importedItem) => {
        const {
            source,
            localName,
            exportName,
        } = importedItem;

        const pathDescriptor = getPathDescriptorWithAlias(source);

        if (!pathDescriptor) {
            return null;
        }

        const collectionType = getCollectionType(pathDescriptor.absolutePath);

        if (!collectionType) {
            return null;
        }

        const baseFilename = path.basename(pathDescriptor.absolutePath);
        const absoluteDirname = path.dirname(pathDescriptor.absolutePath);
        const relativeDirname = path.relative(normalizeSrcPath(), absoluteDirname);

        return {
            ...pathDescriptor,
            localName,
            collectionType,
            exportName,
            name: relativeDirname
                .split(path.sep)
                .concat(getFileEntityIdentifier(baseFilename))
                .join('/'),
        };
    });
};
