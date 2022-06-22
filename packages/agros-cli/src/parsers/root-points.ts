import * as path from 'path';
import * as fs from 'fs-extra';
import * as parser from '@babel/parser';
import { ExpressionStatement, ImportDeclaration, ObjectProperty } from '@babel/types';

export const parseRootPoints = (entryPathname = 'index.ts') => {
    const content = fs.readFileSync(path.resolve(entryPathname)).toString();
    const { program } = parser.parse(content, {
        sourceType: 'module',
        plugins: [
            'jsx',
            'typescript',
            'decorators-legacy',
        ],
    });
    const body = program.body;

    const coreImportDeclaration: ImportDeclaration = body.find((declaration) => {
        if (declaration.type !== 'ImportDeclaration' || !declaration.source.value.startsWith('@agros/core')) {
            return false;
        }

        return true;
    }) as ImportDeclaration;

    if (!coreImportDeclaration) {
        return [];
    }

    let bootstrapFnLocalName: string;

    for (const specifier of (coreImportDeclaration.specifiers || [])) {
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

    const bootstrapArrayDeclaration: ObjectProperty[] = (callerDeclaration.expression as any)?.arguments[0]?.elements as ObjectProperty[] || [];
};
