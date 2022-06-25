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

export type GetContainerLocation = UpdateLocation;

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
 * @returns {GetContainerLocation} the location of `getContainer` or `forwardContainer`
 */
export const detectGetContainerLocation = (
    content: string,
    getContainerTypeMap: GetContainerTypeMap,
): GetContainerLocation | null => {
    const statements = getStatements(content);
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

export const detectDeclarationContainer = (content: string): DeclarationContainer | null => {
    const statements = getStatements(content);
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

    if (containerImportSpecifiers.length === 1) {
        const {
            local,
            imported,
        } = containerImportSpecifiers[0];
        return {
            localName: local.name,
            exportName: (imported as Identifier).name,
        };
    }

    // const getContainerCaller = statements.find();
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
