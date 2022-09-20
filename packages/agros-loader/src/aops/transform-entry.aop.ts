import { detectExports } from '@agros/tools/lib/detectors';
import { ensureImport } from '@agros/tools/lib/ensure-import';
import { EnsureImportOptions } from '@agros/tools/lib/types';
import { parseAST } from '@agros/tools/lib/parse-ast';
import {
    PlatformConfigParser,
    ProjectConfigParser,
} from '@agros/tools/lib/config-parsers';
import * as path from 'path';
import * as template from '@babel/template';
import generate from '@babel/generator';
import {
    createAddVirtualFile,
    createLoaderAOP,
} from '../utils';
import * as t from '@babel/types';
import { Platform } from '@agros/tools/lib/platform.interface';

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
                libName: path.resolve('src', factoryFilename),
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

        tree.program.body.splice(
            lastImportDeclarationIndex + 1,
            0,
            t.functionDeclaration(
                t.identifier('Agros$$bootstrap'),
                [
                    t.identifier('config'),
                ],
                t.blockStatement(template.default.ast(bootstrapDeclarationStr) as t.Statement[]),
            ),
        );
        tree.program.body.splice(lastImportDeclarationIndex + 2, 1);
        const bootstrapReturnValueIdentifier = `return_${Math.random().toString(32).slice(2)}`;
        tree.program.body.push(...parseAST('var ' + bootstrapReturnValueIdentifier + ' = Agros$$bootstrap(' + generate(exportDefaultDeclaration.declaration).code + ');').program.body);
        let newCode = generate(tree).code;

        if (typeof platform.getEntryTailCode === 'function') {
            const tailCodeLines = platform.getEntryTailCode({
                bootstrapReturnValueIdentifier,
            });
            if (Array.isArray(tailCodeLines)) {
                newCode += `\n${tailCodeLines.join('\n')}`;
            }
        }

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
