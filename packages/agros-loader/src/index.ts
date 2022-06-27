/* eslint-disable @typescript-eslint/no-invalid-this */
import * as path from 'path';
import * as fs from 'fs';
import { ProjectConfigParser } from '@agros/config';
import {
    ensureImport,
    EnsureImportOptions,
    parseAST,
} from '@agros/utils';
import { ExportDefaultDeclaration } from '@babel/types';
import ejs from 'ejs';
import generate from '@babel/generator';

const configParser = new ProjectConfigParser();

const transformEntry = (ast: ReturnType<typeof parseAST>): string => {
    let programBody = ast?.program?.body || [];
    let exportDefaultDeclaration: ExportDefaultDeclaration;
    let lastImportDeclarationIndex: number;
    const ensureIdentifierNameMap = {};

    for (const statement of programBody) {
        if (
            statement.type === 'ExportDefaultDeclaration' &&
                statement.declaration.type === 'ArrayExpression'
        ) {
            exportDefaultDeclaration = statement as ExportDefaultDeclaration;
        }

        if (statement.type === 'ImportDeclaration') {
            lastImportDeclarationIndex = statement.loc?.end?.line;
        }
    }

    if (!exportDefaultDeclaration) {
        throw new Error('The entry of an Agros project should export an array of config as default');
    }

    ([
        {
            statements: programBody,
            libName: '@agros/app/lib/router',
            identifierName: 'Routes',
        },
        {
            statements: programBody,
            libName: '@agros/app/lib/router',
            identifierName: 'Route',
        },
        {
            statements: programBody,
            libName: '@agros/app/lib/router',
            identifierName: 'BrowserRouter',
        },
        {
            statements: programBody,
            libName: '@agros/app',
            identifierName: 'Factory',
        },
        {
            statements: programBody,
            libName: '@agros/app',
            identifierName: 'useEffect',
        },
        {
            statements: programBody,
            libName: '@agros/app',
            identifierName: 'useState',
        },
        {
            statements: programBody,
            libName: '@agros/app',
            identifierName: 'Suspense',
        },
    ] as EnsureImportOptions[]).forEach((options) => {
        const {
            statements,
            identifierName: ensuredIdentifierName,
        } = ensureImport(options);

        programBody = statements;
        ensureIdentifierNameMap[options.identifierName] = ensuredIdentifierName;
    });

    const bootstrapDeclarationTemplate = fs.readFileSync(path.resolve(__dirname, '../templates/bootstrap.js.template')).toString();
    const bootstrapDeclarationStr = ejs.render(bootstrapDeclarationTemplate, {
        map: ensureIdentifierNameMap,
    });

    ast.program.body.splice(
        lastImportDeclarationIndex,
        0,
        ...(parseAST(bootstrapDeclarationStr).program.body),
    );

    return generate(ast).code;
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
            console.log(newSource);
            return source;
            // TODO
            // if (newSource) {
            //     return newSource;
            // }
        } catch (e) {
            console.log(e);
            this.emitError(e);
        }
    }

    return source;
}
