/* eslint-disable @typescript-eslint/no-invalid-this */
import { parseAST } from '@agros/utils/lib/parse-ast';
import qs from 'qs';
import { LoaderContext } from 'webpack';
import * as t from '@babel/types';
import generate from '@babel/generator';

export default function(source: string) {
    try {
        const context = this as LoaderContext<{}>;
        const parsedQuery = qs.parse((context.resourceQuery || '').replace(/^\?/, '')) || {};

        if (parsedQuery.component !== 'true') {
            return source;
        }

        const tree = parseAST(source);
        const styleUrls = (parsedQuery.styles as string || '')
            .split(',')
            .filter((styleUrl) => !!styleUrl)
            .map((styleUrl) => decodeURI(styleUrl));

        for (const styleUrl of styleUrls) {
            tree.program.body.unshift(t.importDeclaration([], t.stringLiteral(styleUrl)));
        }

        return generate(tree).code;
    } catch (e) {
        return source;
    }
};
