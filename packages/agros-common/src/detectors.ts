import { parse } from '@babel/parser';
import {
    CallExpression,
    FunctionExpression,
    Identifier,
    ImportDeclaration,
    ImportSpecifier,
    Statement,
    VariableDeclaration,
    VariableDeclarator,
} from '@babel/types';
import _ from 'lodash';

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

export interface GetContainerInfo {
    imported: boolean;
    type: GetContainerType;
    importLocation: UpdateLocation;
    importDeclarationLocation: UpdateLocation;
    callLocation: UpdateLocation;
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
 * @param getContainerTypeMap locale name map for `getContainer` and `forwardContainer`
 * @returns {GetContainerInfo} the location of `getContainer` or `forwardContainer`
 */
export const detectGetContainerInfo = (content: string): GetContainerInfo | null => {
    const statements = getStatements(content);
    const getContainerTypeMap: GetContainerTypeMap = {
        getContainer: 'getContainer',
        forwardContainer: 'forwardContainer',
    };
    const importLocationMap: Record<GetContainerType, UpdateLocation> = {
        getContainer: null,
        forwardContainer: null,
    };
    const importDeclarationMap: Record<GetContainerType, UpdateLocation> = {
        getContainer: null,
        forwardContainer: null,
    };

    const importedAgrosStatement: ImportDeclaration = statements.find((statement) => {
        return statement.type === 'ImportDeclaration' && statement.source.value === '@agros/core';
    }) as ImportDeclaration;

    if (!importedAgrosStatement) {
        return null;
    }

    const importedSpecifiers = (importedAgrosStatement.specifiers || []) as ImportSpecifier[];
    const containerImportSpecifiers = importedSpecifiers.filter((importedSpecifier) => {
        const importedName = (importedSpecifier.imported as Identifier).name;
        return importedName === 'getContainer' || importedName === 'forwardContainer';
    });

    if (containerImportSpecifiers.length === 0) {
        return null;
    }

    containerImportSpecifiers.forEach((specifier) => {
        const {
            loc,
            local,
            imported,
        } = specifier;
        const exportName = (imported as Identifier).name as keyof GetContainerTypeMap;

        if (getContainerTypeMap[exportName]) {
            getContainerTypeMap[exportName] = local.name;
        }

        if (importedAgrosStatement?.loc?.start) {
            importLocationMap[exportName] = {
                line: importedAgrosStatement?.loc?.start?.line,
                column: importedAgrosStatement?.loc?.start?.column,
            };
        }

        if (loc?.start) {
            importDeclarationMap[exportName] = {
                line: loc?.start?.line,
                column: loc?.start?.column,
            };
        }
    });

    let functionBody: Statement[] = [];

    for (const statement of statements) {
        if (statement.type === 'FunctionDeclaration') {
            functionBody = statement.body.body || [];
            break;
        } else if (statement.type === 'VariableDeclaration') {
            const functionDeclarator = (statement.declarations || []).find((declarator) => {
                return declarator?.init?.type === 'ArrowFunctionExpression' || declarator?.init?.type === 'FunctionExpression';
            });
            functionBody = (functionDeclarator.init as FunctionExpression)?.body?.body || [];
            break;
        }
    }

    for (const functionStatement of functionBody) {
        if (
            functionStatement.type !== 'VariableDeclaration' &&
            _.isNumber(functionStatement.loc?.start?.column) &&
            _.isNumber(functionStatement.loc?.end?.line)
        ) {
            continue;
        }

        const declarations: VariableDeclarator[] = ((functionStatement as VariableDeclaration).declarations || []).filter((declaration) => {
            return declaration?.init?.type === 'CallExpression';
        });

        for (const declaration of declarations) {
            if (((declaration?.init as CallExpression)?.callee as Identifier)?.name === getContainerTypeMap['getContainer']) {
                return {
                    line: functionStatement.loc.end.line,
                    column: functionStatement.loc.start.column,
                };
            }
        }
    }

    return null;
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
