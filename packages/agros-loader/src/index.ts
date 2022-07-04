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
import {
    LoaderTransformerConfig,
    LoaderTransformerGuardData,
} from './types';
import generate from '@babel/generator';
import _ from 'lodash';
import { LoaderContext } from 'webpack';

const transform = (source: string, context: LoaderContext<{}>, ...transformers: LoaderTransformerConfig[]) => {
    const configParser = new ProjectConfigParser();
    const srcPath = path.resolve(process.cwd(), configParser.getConfig('baseDir'));
    const parsedQuery = qs.parse((context.resourceQuery || '').replace(/^\?/, '')) || {};
    const guardData: LoaderTransformerGuardData = {
        context,
        parsedQuery,
        srcPath,
    };
    const matchedTransformerConfigs = (transformers || []).filter((transformerConfig) => {
        return transformerConfig.guard(guardData);
    });

    if (matchedTransformerConfigs.length === 0) {
        return;
    }

    let tree = parseAST(source);

    for (const transformerConfig of matchedTransformerConfigs) {
        tree = transformerConfig.transformer({
            tree: _.cloneDeep(tree),
            ...guardData,
        });
    }

    return tree;
};

export default function(source) {
    const resourceAbsolutePath = this.resourcePath;

    if (!resourceAbsolutePath) {
        return source;
    }

    const newAST = transform(
        source,
        this,
        transformEntry,
        transformComponentDecorator,
        transformComponentFile,
    );

    if (!newAST) {
        return source;
    }

    return generate(newAST).code;
}
