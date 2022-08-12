import { detectExports } from '@agros/common';
import {
    ensureImport,
    EnsureImportOptions,
} from '@agros/utils/lib/ensure-import';
import { parseAST } from '@agros/utils/lib/parse-ast';
import { PlatformLoader } from '@agros/utils/lib/platform-loader';
import { ParseResult } from '@babel/parser';
import { File } from '@babel/types';
import * as path from 'path';
import generate from '@babel/generator';
import { createLoaderAOP } from '../utils';
import * as t from '@babel/types';
import { ProjectConfigParser } from '@agros/config';
import { Platform } from '@agros/platforms/lib/platform.interface';

export const transformEntry = createLoaderAOP<ParseResult<File>>(
    ({ tree }) => {
        let exportDefaultDeclarationIndex: number;
        let lastImportDeclarationIndex: number;
        const ensureIdentifierNameMap: Record<string, string> = {};
        const configParser = new ProjectConfigParser();
        const platformName = configParser.getConfig<string>('platform');
        const platformLoader = new PlatformLoader(platformName);
        const platform = platformLoader.getPlatform<Platform>();

        const [exportDefaultDeclaration] = detectExports<t.ArrayExpression>(tree, 'ArrayExpression');

        if (!exportDefaultDeclaration) {
            throw new Error('The entry of an project should export an array of config');
        }

        const imports = ([
            {
                libName: platformName,
                identifierName: 'platform',
                type: 'default',
            },
            {
                libName: platformName,
                identifierName: 'createRoutes',
            },
        ] as Omit<EnsureImportOptions, 'statements'>[]).concat(platform.getLoaderImports());

        for (const importItem of imports) {
            const {
                statements,
                identifierName: ensuredIdentifierName,
            } = ensureImport({
                statements: tree.program.body,
                ...importItem,
            });

            tree.program.body = statements;
            ensureIdentifierNameMap[importItem.identifierName] = ensuredIdentifierName;
        }

        const bootstrapDeclarationStr = platform.getBootstrapCode(ensureIdentifierNameMap);

        for (const [index, statement] of tree.program.body.entries()) {
            if (statement.type === 'ImportDeclaration') {
                lastImportDeclarationIndex = index;
            }
            if (statement.type === 'ExportDefaultDeclaration') {
                exportDefaultDeclarationIndex = index;
            }
        }

        const bootstrapDeclarations = parseAST(bootstrapDeclarationStr).program.body;

        tree.program.body.splice(
            lastImportDeclarationIndex + 1,
            0,
            ...bootstrapDeclarations,
        );
        tree.program.body.splice(exportDefaultDeclarationIndex + bootstrapDeclarations.length, 1);
        tree.program.body.push(...parseAST('bootstrap(' + generate(exportDefaultDeclaration.declaration).code + ');').program.body);

        return tree;
    },
    ({
        srcPath,
        context,
    }) => {
        const absolutePath = context.resourcePath;
        return path.dirname(absolutePath) === srcPath && path.basename(absolutePath) === 'index.ts';
    },
);
