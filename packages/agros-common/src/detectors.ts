import { parseAST } from '@agros/utils';
import { ParseResult } from '@babel/parser';
import {
    CallExpression as BabelCallExpression,
    ClassDeclaration,
    ExportSpecifier,
    File,
    Identifier,
    ImportDeclaration,
    ImportSpecifier,
    Decorator as BabelDecorator,
} from '@babel/types';
import * as fs from 'fs-extra';
import {
    transformAliasedPathToPath,
    transformPathToAliasedPath,
} from './transformers';
import {
    matchAlias,
} from './utils';
import * as path from 'path';
import { normalizeNoExtensionPath } from './normalizers';
import _ from 'lodash';
import { lintCode } from './linters';

export type ExportMode = 'default' | 'named' | 'namedIdentifier' | 'defaultIdentifier';
export interface ClassExportItem {
    declaration: ClassDeclaration;
    exportMode: ExportMode;
    exportIndex: number;
    declarationIndex: number;
    localName?: string;
    exportedName?: string;
}

interface CallExpression extends BabelCallExpression {
    callee: Identifier;
}
export interface Decorator extends BabelDecorator {
    expression: CallExpression;
}

export const detectClassExports = (ast: ParseResult<File>): ClassExportItem[] => {
    const result = [] as ClassExportItem[];
    const exportedIdentifiers = [] as Array<[Identifier, Identifier, number]>;

    for (const [index, statement] of ast.program.body.entries()) {
        if (statement.type === 'ExportDefaultDeclaration') {
            if (statement.declaration.type === 'ClassDeclaration') {
                result.push({
                    declaration: statement.declaration,
                    exportMode: 'default',
                    exportIndex: index,
                    declarationIndex: index,
                });
            } else if (statement.declaration.type === 'Identifier') {
                const exportedDefaultClassDeclarationIndex = ast.program.body.findIndex((currentStatement) => {
                    return currentStatement.type === 'ClassDeclaration' &&
                        currentStatement?.id.name === (statement.declaration as Identifier).name;
                });

                if (exportedDefaultClassDeclarationIndex !== -1) {
                    result.push({
                        declaration: ast.program.body[exportedDefaultClassDeclarationIndex] as ClassDeclaration,
                        exportMode: 'defaultIdentifier',
                        localName: statement.declaration.name,
                        exportIndex: index,
                        declarationIndex: exportedDefaultClassDeclarationIndex,
                    });
                }
            }
        } else if (statement.type === 'ExportNamedDeclaration') {
            if (statement?.declaration?.type === 'ClassDeclaration') {
                result.push({
                    declaration: statement.declaration,
                    exportMode: 'named',
                    localName: statement.declaration.id.name,
                    exportedName: statement.declaration.id.name,
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
        const identifiedClassDeclarationIndex = ast.program.body.findIndex((statement) => {
            return statement.type === 'ClassDeclaration' && statement?.id.name === exportedIdentifier.name;
        });

        if (identifiedClassDeclarationIndex !== -1) {
            result.push({
                declaration: ast.program.body[identifiedClassDeclarationIndex] as ClassDeclaration,
                exportMode: 'namedIdentifier',
                localName: localIdentifier.name,
                exportedName: exportedIdentifier.name,
                exportIndex,
                declarationIndex: identifiedClassDeclarationIndex,
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
    const [exportedClass] = detectClassExports(tree);
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

export interface ClassImportItem {
    imported: boolean;
    exportItem: ClassExportItem;
    identifierName: string;
    sourceLiteralValue?: string;
    importLiteralValue?: string;
}

export const detectImportedClass = async (sourcePath: string, targetPath: string): Promise<ClassImportItem> => {
    const result: ClassImportItem = {
        imported: false,
        exportItem: null,
        identifierName: null,
    };

    if (!fs.existsSync(sourcePath) || !fs.existsSync(targetPath)) {
        return result;
    }

    const sourceAST = parseAST(fs.readFileSync(sourcePath).toString());
    const targetAST = parseAST(fs.readFileSync(targetPath).toString());

    const [exportedClassItem] = detectClassExports(sourceAST);
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
