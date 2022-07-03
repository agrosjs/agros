import { ParseResult } from '@babel/parser';
import { File } from '@babel/types';

export interface LoaderTransformerData {
    tree: ParseResult<File>;
    absolutePath: string;
    srcPath: string;
    parsedQuery: Record<string, any>;
}

export type LoaderTransformer = (data: LoaderTransformerData) => ParseResult<File>;
