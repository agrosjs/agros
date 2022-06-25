import { parse } from '@babel/parser';
import {
    Identifier,
    ImportDeclaration,
    ImportSpecifier,
    Statement,
    VariableDeclaration,
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

export interface AgrosImportType {
    exportName: string;
    localName: string;
};

export interface GetContainerTypeMap {
    'getContainer': string;
    'forwardContainer': string;
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

export const detectGetContainerLocation = (
    content: string,
    getContainerTypeMap: GetContainerTypeMap,
): UpdateLocation | null => {
    const statements = getStatements(content);

    for (const statement of statements) {
        if (statement.type === 'FunctionDeclaration') {
            const functionBody = statement.body.body || [];
            for (const functionStatement of functionBody) {
                if (
                    _.isNumber(functionStatement.loc?.start?.column) &&
                    _.isNumber(functionStatement.loc?.end?.line) &&
                    functionStatement.type === 'VariableDeclaration' &&
                    (functionStatement as any)?.init?.callee?.name === getContainerTypeMap['getContainer']
                ) {
                    return {
                        line: functionStatement.loc.end.line,
                        column: functionStatement.loc.start.column + 1,
                    };
                }
            }
        }
    }

    return null;
};

export const detectAgrosImportType = (content: string): AgrosImportType | null => {
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
    let containerLocalName: string;

    console.log(JSON.stringify(body));

    // for (const statement of body) {
    // }
};

export const getModuleProvidersUpdateLocation = () => {};

export const getModuleComponentsUpdateLocation = () => {};

export const getModuleExportsUpdateLocation = () => {};

export const getModuleImportsUpdateLocation = () => {};

export const getComponentDeclarationsUpdateLocation = () => {};
