import { ParseResult } from '@babel/parser';
import {
    ClassDeclaration,
    ExportSpecifier,
    File,
    Identifier,
    ImportDeclaration,
    ImportSpecifier,
} from '@babel/types';

export type ExportMode = 'default' | 'named' | 'namedIdentifier' | 'defaultIdentifier';
export interface ClassExportItem {
    declaration: ClassDeclaration;
    exportMode: ExportMode;
    exportIndex: number;
    declarationIndex: number;
    localName?: string;
    exportedName?: string;
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
