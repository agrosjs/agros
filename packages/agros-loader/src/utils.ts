import {
    LoaderAOPBaseData,
    LoaderAOPData,
    LoaderAOPFunction,
} from './types';
import qs from 'qs';
import { LoaderContext } from 'webpack';
import { parseAST } from '@agros/utils/lib/parse-ast';
import {
    normalizeModulesPath,
    normalizeSrcPath,
} from '@agros/common';
import { ParseResult } from '@babel/parser';
import { File } from '@babel/types';
import generate from '@babel/generator';

export const createLoaderAOP = <R = any>(
    aop: (data: LoaderAOPData) => R,
    active: (data: LoaderAOPBaseData) => boolean = () => true,
): LoaderAOPFunction<R> => {
    return (data) => {
        if (!active(data)) {
            return 'NOOP';
        }

        const tree = parseAST(data.source);

        return aop({
            ...data,
            tree,
        });
    };
};

export const check = async (source: string, context: LoaderContext<{}>, ...checkers: LoaderAOPFunction[]) => {
    const parsedQuery = qs.parse((context.resourceQuery || '').replace(/^\?/, '')) || {};
    const aopData: LoaderAOPBaseData = {
        context,
        parsedQuery,
        srcPath: normalizeSrcPath(),
        modulesPath: normalizeModulesPath(),
        source,
    };

    for (const checker of checkers) {
        await checker(aopData);
    }
};

export const transform = async (
    source: string,
    context: LoaderContext<{}>,
    ...transformers: LoaderAOPFunction<ParseResult<File>>[]
) => {
    const parsedQuery = qs.parse((context.resourceQuery || '').replace(/^\?/, '')) || {};
    const partialAOPData: Omit<LoaderAOPBaseData, 'source'> = {
        context,
        parsedQuery,
        srcPath: normalizeSrcPath(),
        modulesPath: normalizeModulesPath(),
    };

    let result: ParseResult<File>;

    for (const transformer of transformers) {
        try {
            const currentTransformResult = await transformer({
                ...partialAOPData,
                source: result ? generate(result).code : source,
            });
            if (currentTransformResult && currentTransformResult !== 'NOOP') {
                result = currentTransformResult;
            }
        } catch (e) {}
    }

    return result;
};
