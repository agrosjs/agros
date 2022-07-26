import { ParseResult } from '@babel/parser';
import { File } from '@babel/types';
import { LoaderContext } from 'webpack';

export interface LoaderAOPData {
    srcPath: string;
    parsedQuery: Record<string, any>;
    context: LoaderContext<{}>;
    modulesPath: string;
    tree: ParseResult<File>;
}

export type LoaderAOPFunction<R = any> = (data: LoaderAOPData) => R | 'NOOP';
