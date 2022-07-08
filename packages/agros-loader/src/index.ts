/* eslint-disable @typescript-eslint/no-invalid-this */
import { parseAST } from '@agros/utils';
import qs from 'qs';
import {
    transformComponentDecorator,
    transformComponentFile,
    transformEntry,
} from './transformers';
import {
    LoaderTransformerConfig,
    LoaderGuardData,
    LoaderCheckerConfig,
} from './types';
import generate from '@babel/generator';
import _ from 'lodash';
import { LoaderContext } from 'webpack';
import {
    checkModule,
    checkService,
} from './checkers';
import {
    normalizeModulesPath,
    normalizeSrcPath,
} from '@agros/common';

const transform = (source: string, context: LoaderContext<{}>, ...transformers: LoaderTransformerConfig[]) => {
    const parsedQuery = qs.parse((context.resourceQuery || '').replace(/^\?/, '')) || {};
    const guardData: LoaderGuardData = {
        context,
        parsedQuery,
        srcPath: normalizeSrcPath(),
        modulesPath: normalizeModulesPath(),
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

const check = (source: string, context: LoaderContext<{}>, ...checkers: LoaderCheckerConfig[]) => {
    const parsedQuery = qs.parse((context.resourceQuery || '').replace(/^\?/, '')) || {};
    const guardData: LoaderGuardData = {
        context,
        parsedQuery,
        srcPath: normalizeSrcPath(),
        modulesPath: normalizeModulesPath(),
    };
    const tree = parseAST(source);
    const matchedCheckerConfigs = (checkers || []).filter((checkerConfig) => {
        return checkerConfig.guard(guardData);
    });

    if (matchedCheckerConfigs.length === 0) {
        return;
    }

    matchedCheckerConfigs.forEach((checkerConfig) => {
        checkerConfig.checker({
            ...guardData,
            tree,
        });
    });
};

export default function(source) {
    const resourceAbsolutePath = this.resourcePath;

    if (!resourceAbsolutePath) {
        return source;
    }

    check(
        source,
        this,
        checkModule,
        checkService,
    );

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
