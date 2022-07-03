/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-invalid-this */
import * as path from 'path';
import { ProjectConfigParser } from '@agros/config';
import { parseAST } from '@agros/utils';
import qs from 'qs';
import {
    transformComponentDecorator,
    transformComponentFile,
    transformEntry,
} from './transformers';
import { LoaderTransformer } from './types';
import generate from '@babel/generator';
import _ from 'lodash';
import { getCollectionType } from '@agros/common';

// const transform = (source: string, context: any, ...transformers: LoaderTransformer[]) => {
//     const configParser = new ProjectConfigParser();
//     let tree = parseAST(source);
//     const parsedQuery = qs.parse((context.resourceQuery || '').replace(/^\?/, '')) || {};

//     for (const transformer of transformers) {
//         const srcPath = path.resolve(process.cwd(), configParser.getConfig('baseDir'));
//         tree = transformer({
//             tree: _.cloneDeep(tree),
//             absolutePath: context.resourcePath,
//             srcPath,
//             parsedQuery,
//         });
//     }

//     return tree;
// };
const configParser = new ProjectConfigParser();

export default function(source) {
    const resourceAbsolutePath = this.resourcePath;

    if (!resourceAbsolutePath) {
        return source;
    }

    const srcAbsolutePath = path.resolve(
        process.cwd(),
        configParser.getConfig('baseDir'),
    );
    const parsedQuery = qs.parse((this.resourceQuery || '').replace(/^\?/, '')) || {};
    let ast = parseAST(source);

    if (path.dirname(resourceAbsolutePath) === srcAbsolutePath && path.basename(resourceAbsolutePath) === 'index.ts') {
        ast = transformEntry({
            tree: _.cloneDeep(ast),
            absolutePath: this.resourcePath,
            srcPath: srcAbsolutePath,
            parsedQuery,
        });
        return generate(ast).code;
    }

    if (getCollectionType(resourceAbsolutePath) === 'component') {
        ast = transformComponentDecorator({
            tree: _.cloneDeep(ast),
            absolutePath: this.resourcePath,
            srcPath: srcAbsolutePath,
            parsedQuery,
        });
        return generate(ast).code;
    }

    if (parsedQuery.component && parsedQuery.component === 'true') {
        ast = transformComponentFile({
            tree: _.cloneDeep(ast),
            absolutePath: this.resourcePath,
            srcPath: srcAbsolutePath,
            parsedQuery,
        });
        return generate(ast).code;
    }

    return source;
}
