import { parse } from '@babel/parser';
import {
    ArrowFunctionExpression,
    ExportDefaultDeclaration,
    // Expression,
    FunctionDeclaration,
    Identifier,
    ImportDeclaration,
    ImportSpecifier,
    SourceLocation,
    Statement,
    VariableDeclarator,
} from '@babel/types';

export interface UpdateLocation {
    /**
     * start line number, starts from 1
     */
    line: number;
    /**
     * start column number, starts from 1
     */
    column: number;
}

export interface GetContainerTypeMap {
    getContainer: string;
    forwardContainer: string;
}
export interface DeclarationContainer {
    exportName: string;
    localName: string;
};

export type GetContainerType = keyof GetContainerTypeMap;

export interface ComponentInfo {
    imported: boolean;
    /**
     * component declaration name
     */
    name: string;
    singleLine: boolean;
    type: GetContainerType | null;
    localNameMap: GetContainerTypeMap;
    functionLocation: SourceLocation | null;
    importLocation: SourceLocation | null;
    importDeclarationLocation: SourceLocation | null;
    callLocation: SourceLocation | null;
    noBlock: boolean;
}

const getStatements = (content: string): Statement[] => {
    if (!content) {
        return [];
    }

    const ast = parse(content, {
        sourceType: 'module',
        plugins: [
            'jsx',
            'typescript',
            'throwExpressions',
            'decorators-legacy',
            'dynamicImport',
            'exportDefaultFrom',
            'objectRestSpread',
            'optionalChaining',
        ],
    });

    return ast.program.body || [];
};

/**
 * detect the location of container declaration
 * @param content the content of file
 * @returns {ComponentInfo} the location of `getContainer` or `forwardContainer`
 */
export const detectContainerInfo = (content: string, exportName: string | 'default'): ComponentInfo | null => {
    const statements = getStatements(content);
    const importLocationMap: Record<GetContainerType, SourceLocation> = {
        getContainer: null,
        forwardContainer: null,
    };
    const importDeclarationMap: Record<GetContainerType, SourceLocation> = {
        getContainer: null,
        forwardContainer: null,
    };
    const result: ComponentInfo = {
        imported: false,
        name: null,
        type: null,
        importLocation: null,
        importDeclarationLocation: null,
        functionLocation: null,
        callLocation: null,
        localNameMap: {
            getContainer: 'getContainer',
            forwardContainer: 'forwardContainer',
        },
        singleLine: false,
        noBlock: false,
    };

    const importedAgrosStatement: ImportDeclaration = statements.find((statement) => {
        return statement.type === 'ImportDeclaration' && statement.source.value === '@agros/core';
    }) as ImportDeclaration;

    if (!importedAgrosStatement) {
        return result;
    }

    const importedSpecifiers = (importedAgrosStatement.specifiers || []) as ImportSpecifier[];
    const containerImportSpecifiers = importedSpecifiers.filter((importedSpecifier) => {
        const importedName = (importedSpecifier.imported as Identifier).name;
        return importedName === 'getContainer' || importedName === 'forwardContainer';
    });

    if (containerImportSpecifiers.length === 0) {
        return result;
    }

    result.imported = true;

    /**
     * parse import declaration locations
     */
    containerImportSpecifiers.forEach((specifier) => {
        const {
            loc,
            local,
            imported,
        } = specifier;
        const exportName = (imported as Identifier).name as keyof GetContainerTypeMap;

        if (result.localNameMap[exportName]) {
            result.localNameMap[exportName] = local.name;
        }

        if (importedAgrosStatement?.loc) {
            importLocationMap[exportName] = importedAgrosStatement.loc;
        }

        if (loc?.start) {
            importDeclarationMap[exportName] = loc;
        }
    });

    /**
     * get the component function position and info
     */
    let componentDeclaration: Identifier | ArrowFunctionExpression | FunctionDeclaration;
    // let componentDeclaratorInitExpression: Expression;

    if (exportName === 'default') {
        const exportDefaultDeclaration = statements.find((statement) => {
            return statement.type === 'ExportDefaultDeclaration';
        }) as ExportDefaultDeclaration;

        if (!exportDefaultDeclaration) {
            return result;
        }

        componentDeclaration = exportDefaultDeclaration.declaration as Identifier | ArrowFunctionExpression | FunctionDeclaration;
    }

    switch (componentDeclaration.type) {
        case 'Identifier': {
            const currentDeclaration = statements.reduce((result, statement) => {
                if (statement.type === 'VariableDeclaration') {
                    return result.concat((statement.declarations || []));
                }
                return result;
            }, [] as VariableDeclarator[]).find((declarator) => {
                return (declarator.id as Identifier).name === (componentDeclaration as Identifier).name;
            });

            if (!currentDeclaration) {
                return result;
            }

            // componentDeclaratorInitExpression = currentDeclaration?.init;
            break;
        }
        case 'ArrowFunctionExpression':
        case 'FunctionDeclaration': {
            // componentDeclaratorInitExpression = componentDeclaration.body;
            break;
        }
        default:
            return result;
    }
};

export const getImportStatementUpdateLocation = () => {};

export const getComponentGetDeclarationsUpdateLocation = (content: string) => {
    if (!content) {
        return null;
    }

    const body = getStatements(content);
    // let containerLocalName: string;

    console.log(JSON.stringify(body));

    // for (const statement of body) {
    // }
};

export const getModuleProvidersUpdateLocation = () => {};

export const getModuleComponentsUpdateLocation = () => {};

export const getModuleExportsUpdateLocation = () => {};

export const getModuleImportsUpdateLocation = () => {};

export const getComponentDeclarationsUpdateLocation = () => {};
