import { ParseResult } from '@babel/parser';
import { File } from '@babel/types';
import { LoaderContext } from 'webpack';

export interface LoaderGuardData {
    srcPath: string;
    parsedQuery: Record<string, any>;
    context: LoaderContext<{}>;
    modulesPath: string;
}

export interface LoaderTransformerData extends LoaderGuardData {
    tree: ParseResult<File>;
}

export type LoaderTransformer = (data: LoaderTransformerData) => ParseResult<File>;
export type LoaderGuard = (data: LoaderGuardData) => boolean;

export interface LoaderTransformerConfig {
    guard: LoaderGuard;
    transformer: LoaderTransformer;
}

export type LoaderCheckerData = LoaderTransformerData;
export type LoaderChecker = (data: LoaderCheckerData) => void;

export interface LoaderCheckerConfig {
    guard: LoaderGuard;
    checker: LoaderChecker;
}
