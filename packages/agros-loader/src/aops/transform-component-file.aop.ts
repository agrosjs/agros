import {
    createLoaderAOP,
    splitCode,
} from '../utils';
import * as t from '@babel/types';
import { PlatformLoader } from '@agros/utils/lib/platform-loader';
import { ProjectConfigParser } from '@agros/config';
import generate from '@babel/generator';
import { parseAST } from '@agros/utils';

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

        const newScriptCode = generate(tree).code;
        const [headCode, tailCode] = splitCode(source, codeScript?.location);
        let newCode = [headCode, newScriptCode, tailCode].join('\n');

        return newCode;
    },
    async ({ parsedQuery }) => parsedQuery.component && parsedQuery.component === 'true',
);
