/* eslint-disable @typescript-eslint/no-invalid-this */
import * as path from 'path';
import { ProjectConfigParser } from '@agros/config';
import { parseAST } from '@agros/utils';
import {
    ExportDefaultDeclaration,
    Identifier,
    ImportDeclaration,
} from '@babel/types';
import template from '@babel/template';

const configParser = new ProjectConfigParser();

const transformEntry = (ast: ReturnType<typeof parseAST>): string => {
    let programBody = ast?.program?.body || [];
    let exportDefaultDeclaration: ExportDefaultDeclaration;
    let appRouterImportDeclaration: ImportDeclaration;
    let appRouteIdentifierName: string;

    for (const statement of programBody) {
        if (
            statement.type === 'ExportDefaultDeclaration' &&
                statement.declaration.type === 'ArrayExpression'
        ) {
            exportDefaultDeclaration = statement as ExportDefaultDeclaration;
        } else if (
            statement.type === 'ImportDeclaration' &&
                statement.source.value.endsWith('@agros/lib/router')
        ) {
            appRouterImportDeclaration = statement as ImportDeclaration;
        }
    }

    if (!exportDefaultDeclaration) {
        throw new Error('The entry of an Agros project should export an array of config as default');
    }

    if (!appRouterImportDeclaration) {
        appRouteIdentifierName = 'Agros$Route';
        const statement = template.ast(`import { Route as ${appRouteIdentifierName} } from '@agros/lib/router';`) as ImportDeclaration;
        programBody.unshift(statement);
        appRouterImportDeclaration = statement;
    } else {
        for (const specifier of appRouterImportDeclaration.specifiers) {
            if (specifier.type === 'ImportDefaultSpecifier' || specifier.type === 'ImportNamespaceSpecifier') {
                appRouteIdentifierName = `${specifier.local.name}.Route`;
            } else if ((specifier.imported as Identifier).name === 'Route') {
                appRouteIdentifierName = (specifier.local as Identifier).name;
            }
        }

        if (!appRouteIdentifierName) {
            // TODO
        }
    }

    return '';
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

    return source;
}
