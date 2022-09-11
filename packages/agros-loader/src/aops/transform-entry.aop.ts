import { detectExports } from '@agros/common';
import {
    ensureImport,
    EnsureImportOptions,
} from '@agros/utils/lib/ensure-import';
import { parseAST } from '@agros/utils/lib/parse-ast';
import { PlatformConfigParser } from '@agros/config/lib/platform-config-parser';
import * as path from 'path';
import generate from '@babel/generator';
import {
    createAddVirtualFile,
    createLoaderAOP,
} from '../utils';
import * as t from '@babel/types';
import { ProjectConfigParser } from '@agros/config';
import { Platform } from '@agros/platforms/lib/platform.interface';

export const transformEntry = createLoaderAOP(
    async ({
        tree,
        context,
        factoryFilename,
    }) => {
        let lastImportDeclarationIndex: number;
        const ensureIdentifierNameMap: Record<string, string> = {};
        const configParser = new ProjectConfigParser();
        const platformName = configParser.getConfig<string>('platform');
        const platform = new PlatformConfigParser(platformName).getPlatform<Platform>();
        const addVirtualFile = createAddVirtualFile(context);
        const [exportDefaultDeclaration] = detectExports<t.ObjectExpression>(tree, 'ObjectExpression');

        if (!exportDefaultDeclaration) {
            throw new Error('The entry of an project should export an object of config');
        }

        addVirtualFile(
            `src/${factoryFilename}.ts`,
            `
                import { Factory } from '@agros/app/lib/factory';
                import platform from '${platformName}';
                const factory = new Factory(platform);
                export default factory;
            `,
        );

        const imports = ([
            {
                libName: platformName,
                identifierName: 'platform',
                type: 'default',
            },
            {
                libName: `./${factoryFilename}`,
                identifierName: 'factory',
                type: 'default',
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

        const bootstrapDeclarationStr = platform.getBootstrapCode(ensureIdentifierNameMap, addVirtualFile);

        for (const [index, statement] of tree.program.body.entries()) {
            if (statement.type === 'ImportDeclaration') {
                lastImportDeclarationIndex = index;
            }
        }

        const bootstrapDeclarations = parseAST(bootstrapDeclarationStr).program.body;

        tree.program.body.splice(
            lastImportDeclarationIndex + 1,
            0,
            t.functionDeclaration(
                t.identifier('Agros$$bootstrap'),
                [
                    t.identifier('config'),
                ],
                t.blockStatement(bootstrapDeclarations),
            ),
        );
        tree.program.body.splice(lastImportDeclarationIndex + 2, 1);
        tree.program.body.push(...parseAST('Agros$$bootstrap(' + generate(exportDefaultDeclaration.declaration).code + ');').program.body);
        const newCode = generate(tree).code;

        return newCode;
    },
    async ({
        srcPath,
        context,
    }) => {
        const absolutePath = context.resourcePath;
        return path.dirname(absolutePath) === srcPath && path.basename(absolutePath) === 'index.ts';
    },
);
