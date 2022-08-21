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
import { CodeLocation } from '@agros/utils/lib/platform-loader';

export const createLoaderAOP = <T = string>(
    aop: (data: LoaderAOPData) => Promise<T>,
    active: (data: LoaderAOPBaseData) => Promise<boolean> = () => Promise.resolve(true),
): LoaderAOPFunction<T> => {
    return async (data) => {
        if (!(await active(data))) {
            return 'NOOP';
        }

        let tree;

        try {
            tree = parseAST(data.source);
        } catch (e) {}

        return await aop({
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
    ...transformers: LoaderAOPFunction[]
) => {
    const parsedQuery = qs.parse((context.resourceQuery || '').replace(/^\?/, '')) || {};
    const partialAOPData: Omit<LoaderAOPBaseData, 'source'> = {
        context,
        parsedQuery,
        srcPath: normalizeSrcPath(),
        modulesPath: normalizeModulesPath(),
    };

    let result: string;

    for (const transformer of transformers) {
        try {
            const currentTransformResult = await transformer({
                ...partialAOPData,
                source: result || source,
            });
            if (currentTransformResult && currentTransformResult !== 'NOOP') {
                result = currentTransformResult;
            }
        } catch (e) {}
    }

    return result;
};

export const splitCode = (source: string, location?: CodeLocation): [string, string] => {
    if (!location) {
        return ['', ''];
    }

    return [
        source.slice(0, location.start),
        source.slice(location.end),
    ];
};
