import { createLoaderAOP } from '../utils';
import * as t from '@babel/types';

export const transformComponentFile = createLoaderAOP(
    ({
        tree,
        parsedQuery,
    }) => {
        const styleUrls = (parsedQuery.styles as string || '')
            .split(',')
            .filter((styleUrl) => !!styleUrl)
            .map((styleUrl) => decodeURI(styleUrl));

        for (const styleUrl of styleUrls) {
            tree.program.body.unshift(t.importDeclaration([], t.stringLiteral(styleUrl)));
        }

        return tree;
    },
    ({ parsedQuery }) => parsedQuery.component && parsedQuery.component === 'true',
);
