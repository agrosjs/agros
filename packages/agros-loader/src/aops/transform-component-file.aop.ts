import {
    createLoaderAOP,
    splitCode,
} from '../utils';
import * as t from '@babel/types';
import {
    ProjectConfigParser,
    PlatformConfigParser,
} from '@agros/tools/lib/config-parsers';
import generate from '@babel/generator';
import { parseAST } from '@agros/tools/lib/parse-ast';
import { detectNamedImports } from '@agros/tools/lib/detectors';
import traverse from '@babel/traverse';
import * as path from 'path';
import { ComponentScript } from '@agros/tools/lib/types';

export const transformComponentFile = createLoaderAOP(
    async ({
        parsedQuery,
        source,
        tree: astTree,
        factoryFilename,
    }) => {
        let tree = astTree;
        const configParser = new ProjectConfigParser();
        const platformLoader = new PlatformConfigParser(configParser.getConfig<string>('platform'));
        const bundlessPlatform = platformLoader.getBundlessPlatform();
        let scriptContent: string;
        let componentScript: ComponentScript;

        if (typeof bundlessPlatform.getComponentScript === 'function') {
            componentScript = bundlessPlatform.getComponentScript(source);
        }

        if (!tree) {
            if (!componentScript) {
                scriptContent = source;
            }

            if (!componentScript?.content && !scriptContent) {
                scriptContent = '';
            } else {
                scriptContent = componentScript.content;
            }

            if (!scriptContent) {
                return source;
            }

            tree = parseAST(scriptContent);
        }

        const styleUrls = (parsedQuery.styles as string || '')
            .split(',')
            .filter((styleUrl) => !!styleUrl)
            .map((styleUrl) => decodeURI(styleUrl));

        for (const styleUrl of styleUrls) {
            tree.program.body.unshift(t.importDeclaration([], t.stringLiteral(styleUrl)));
        }

        const [getContainerImportSpecifier] = detectNamedImports(
            tree,
            'getContainer',
            (source) => source.indexOf('@agros/app') !== -1,
        );

        if (getContainerImportSpecifier) {
            const getContainerIdentifierName = getContainerImportSpecifier.local.name;
            traverse(
                tree,
                {
                    CallExpression(path) {
                        if ((path.node.callee as t.Identifier).name === getContainerIdentifierName) {
                            path.replaceWith(
                                t.callExpression(
                                    t.identifier(getContainerIdentifierName),
                                    [
                                        t.identifier('__AGROS_DEPS_MAP__'),
                                    ],
                                ),
                            );
                            path.skip();
                        }
                    },
                },
            );
        }

        let newScriptCode = generate(tree).code;

        newScriptCode = [
            'import __AGROS_FACTORY__ from \'' +
            path.resolve(
                path.dirname(
                    path.resolve(process.cwd(), configParser.getEntry()),
                ),
                factoryFilename,
            ) +
            '\';',
            `const __AGROS_DEPS_MAP__ = __AGROS_FACTORY__.generateDependencyMap('${parsedQuery['component_uuid']}');`,
        ].join('\n') + newScriptCode;

        const [headCode, tailCode] = splitCode(source, componentScript?.location);
        const newCode = [headCode, newScriptCode, tailCode].join('\n');

        return newCode;
    },
    async ({ parsedQuery }) => parsedQuery.component && parsedQuery.component === 'true',
);
