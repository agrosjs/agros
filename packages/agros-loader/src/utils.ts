import {
    LoaderAOPData,
    LoaderAOPFunction,
} from './types';
import qs from 'qs';
import { LoaderContext } from 'webpack';
import { parseAST } from '@agros/utils';
import {
    normalizeModulesPath,
    normalizeSrcPath,
} from '@agros/common';
import { ParseResult } from '@babel/parser';
import { File } from '@babel/types';

export const createLoaderAOP = <R = any>(
    aop: (data: LoaderAOPData) => R,
    active: (data: LoaderAOPData) => boolean = () => true,
): LoaderAOPFunction<R> => {
    return (data) => {
        if (!active(data)) {
            return 'NOOP';
        }

        return aop(data);
    };
};

export const check = (source: string, context: LoaderContext<{}>, ...checkers: LoaderAOPFunction[]) => {
    const tree = parseAST(source);
    const parsedQuery = qs.parse((context.resourceQuery || '').replace(/^\?/, '')) || {};
    const aopData: LoaderAOPData = {
        context,
        parsedQuery,
        srcPath: normalizeSrcPath(),
        modulesPath: normalizeModulesPath(),
        tree,
    };

    checkers.forEach((checker) => checker(aopData));
};

export const transform = (source: string, context: LoaderContext<{}>, ...transformers: LoaderAOPFunction<ParseResult<File>>[]) => {
    const tree = parseAST(source);
    const parsedQuery = qs.parse((context.resourceQuery || '').replace(/^\?/, '')) || {};
    const partialAOPData: Omit<LoaderAOPData, 'tree'> = {
        context,
        parsedQuery,
        srcPath: normalizeSrcPath(),
        modulesPath: normalizeModulesPath(),
    };

    let result: ParseResult<File>;

    for (const transformer of transformers) {
        const currentTransformResult = transformer({
            ...partialAOPData,
            tree: result || tree,
        });

        if (currentTransformResult && currentTransformResult !== 'NOOP') {
            result = currentTransformResult;
        }
    }

    return result;
};
