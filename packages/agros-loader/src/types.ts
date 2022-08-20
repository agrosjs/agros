import { ParseResult } from '@babel/parser';
import { File } from '@babel/types';
import { LoaderContext } from 'webpack';

export interface LoaderAOPBaseData {
    srcPath: string;
    parsedQuery: Record<string, any>;
    context: LoaderContext<{}>;
    modulesPath: string;
    source: string;
}

export interface LoaderAOPData extends LoaderAOPBaseData {
    tree: ParseResult<File>;
}

export type LoaderAOPFunction<R = any> = (data: LoaderAOPBaseData) => R | 'NOOP';
