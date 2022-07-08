import generate from '@babel/generator';
import * as t from '@babel/types';
import { lintCode } from './utils';

export const generateDecoratorCode = async (ast: t.Node): Promise<string> => {
    const CLASS_PLACEHOLDER = 'class AgrosPlaceholder {}';
    const rawCode = generate(ast as any).code + '\n' + CLASS_PLACEHOLDER;
    const codeLines = (await lintCode(rawCode)).split(/\r|\n|\r\n/);
    return codeLines.slice(0, codeLines.indexOf(CLASS_PLACEHOLDER)).join('\n');
};
