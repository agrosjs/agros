import { ParseResult } from '@babel/parser';
import { File } from '@babel/types';
import { LoaderContext } from 'webpack';

export type LoaderAOPBaseData<E = {}> = {
    srcPath: string;
    parsedQuery: Record<string, any>;
    context: LoaderContext<{}>;
    modulesPath: string;
    source: string;
} & E;

export type LoaderAOPData<T = {}> = LoaderAOPBaseData<T> & {
    tree?: ParseResult<File>;
};

export type LoaderAOPFunction<T = string, E = {}> = (data: LoaderAOPBaseData<E>) => Promise<T | 'NOOP'>;
