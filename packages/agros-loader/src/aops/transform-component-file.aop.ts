import {
    createLoaderAOP,
    splitCode,
} from '../utils';
import * as t from '@babel/types';
import { PlatformLoader } from '@agros/utils/lib/platform-loader';
import { ProjectConfigParser } from '@agros/config';
import generate from '@babel/generator';
import { parseAST } from '@agros/utils';
import { detectNamedImports } from '@agros/common/lib/detectors';
import traverse from '@babel/traverse';
import * as path from 'path';

export const transformComponentFile = createLoaderAOP(
    async ({
        parsedQuery,
        source,
        tree: astTree,
    }) => {
        let tree = astTree;
        const configParser = new ProjectConfigParser();
        const platformLoader = new PlatformLoader(configParser.getConfig<string>('platform'));
        const codeScript = platformLoader.getComponentScript(source);
        let scriptContent: string;

        if (!tree) {
            if (!codeScript) {
                scriptContent = source;
            }

            if (!codeScript?.content && !scriptContent) {
                scriptContent = '';
            } else {
                scriptContent = codeScript.content;
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
            `import __AGROS_FACTORY__ from '${path.resolve(process.cwd(), configParser.getEntry())}';`,
            `const __AGROS_DEPS_MAP__ = __AGROS_FACTORY__.generateComponentInstanceDependencyMap('${parsedQuery['component_id']}');`,
        ].join('\n') + newScriptCode;

        const [headCode, tailCode] = splitCode(source, codeScript?.location);
        const newCode = [headCode, newScriptCode, tailCode].join('\n');

        return newCode;
    },
    async ({ parsedQuery }) => parsedQuery.component && parsedQuery.component === 'true',
);
