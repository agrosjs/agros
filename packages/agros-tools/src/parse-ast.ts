import {
    parse,
    ParseResult,
} from '@babel/parser';
import { File } from '@babel/types';

export const parseAST = (source: string): ParseResult<File> => {
    return parse(source, {
        sourceType: 'module',
        plugins: [
            'jsx',
            'typescript',
            'decorators-legacy',
            'dynamicImport',
            'throwExpressions',
            'objectRestSpread',
            'optionalChaining',
            'classPrivateMethods',
            'classPrivateProperties',
            'classProperties',
            'classStaticBlock',
            'exportDefaultFrom',
            'exportNamespaceFrom',
        ],
    });
};
