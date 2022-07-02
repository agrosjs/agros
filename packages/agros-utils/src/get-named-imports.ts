import { ParseResult } from '@babel/parser';
import {
    File,
    ImportSpecifier,
} from '@babel/types';

export interface NamedImport {
    specifier: ImportSpecifier;
    declarationIndex: number;
}

export const getNamedImports = (ast: ParseResult<File>) => {};
