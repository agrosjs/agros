import { ParseResult } from '@babel/parser';
import { File } from '@babel/types';
import { LoaderContext } from 'webpack';

export interface LoaderTransformerGuardData {
    srcPath: string;
    parsedQuery: Record<string, any>;
    context: LoaderContext<{}>;
}

export interface LoaderTransformerData extends LoaderTransformerGuardData {
    tree: ParseResult<File>;
}

export type LoaderTransformer = (data: LoaderTransformerData) => ParseResult<File>;
export type LoaderGuard = (data: LoaderTransformerGuardData) => boolean;

export interface LoaderTransformerConfig {
    guard: LoaderGuard;
    transformer: LoaderTransformer;
}
