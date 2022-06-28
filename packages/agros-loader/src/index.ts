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
    let exportDefaultDeclaration: ExportDefaultDeclaration;
    let exportDefaultDeclarationIndex: number;
    let lastImportDeclarationIndex: number;
    const ensureIdentifierNameMap = {};

    for (const statement of ast.program.body) {
        if (
            statement.type === 'ExportDefaultDeclaration' &&
                statement.declaration.type === 'ArrayExpression'
        ) {
            exportDefaultDeclaration = statement as ExportDefaultDeclaration;
        }
    }

    if (!exportDefaultDeclaration) {
        throw new Error('The entry of an Agros project should export an array of config as default');
    }

    const imports = [
        {
            libName: '@agros/app/lib/router',
            identifierName: 'Routes',
        },
        {
            libName: '@agros/app/lib/router',
            identifierName: 'Route',
        },
        {
            libName: '@agros/app/lib/router',
            identifierName: 'BrowserRouter',
        },
        {
            libName: '@agros/app/lib/factory',
            identifierName: 'Factory',
        },
        {
            libName: '@agros/app',
            identifierName: 'useEffect',
        },
        {
            libName: '@agros/app',
            identifierName: 'useState',
        },
        {
            libName: '@agros/app',
            identifierName: 'createElement',
        },
        {
            libName: '@agros/app',
            identifierName: 'render',
        },
        {
            libName: '@agros/app',
            identifierName: 'Suspense',
        },
    ] as Omit<EnsureImportOptions, 'statements'>[];

    for (const importItem of imports) {
        const {
            statements,
            identifierName: ensuredIdentifierName,
        } = ensureImport({
            statements: ast.program.body,
            ...importItem,
        });

        ast.program.body = statements;
        ensureIdentifierNameMap[importItem.identifierName] = ensuredIdentifierName;
    }

    const bootstrapDeclarationTemplate = fs.readFileSync(path.resolve(__dirname, '../templates/bootstrap.js.template')).toString();
    const bootstrapDeclarationStr = ejs.render(bootstrapDeclarationTemplate, {
        map: ensureIdentifierNameMap,
    });

    for (const [index, statement] of ast.program.body.entries()) {
        if (statement.type === 'ImportDeclaration') {
            lastImportDeclarationIndex = index;
        }
        if (statement.type === 'ExportDefaultDeclaration') {
            exportDefaultDeclarationIndex = index;
        }
    }

    const bootstrapDeclarations = parseAST(bootstrapDeclarationStr).program.body;

    ast.program.body.splice(
        lastImportDeclarationIndex + 1,
        0,
        ...bootstrapDeclarations,
    );

    ast.program.body.splice(exportDefaultDeclarationIndex + bootstrapDeclarations.length, 1);

    ast.program.body.push(
        ...parseAST(
            'bootstrap(' +
            generate(exportDefaultDeclaration.declaration).code +
            ');',
        ).program.body,
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
            if (newSource) {
                return newSource;
            }
        } catch (e) {
            this.emitError(e);
        }
    }

    return source;
}
