import generate from '@babel/generator';
import * as t from '@babel/types';
import prettier from 'prettier';
import * as path from 'path';
import { ProjectConfigParser } from '@agros/config';

export const generateDecoratorCode = async (ast: t.Node): Promise<string> => {
    const projectConfigParser = new ProjectConfigParser();
    const code = await prettier.format(
        generate(ast as any).code + '\nclass AgrosPlaceholder {}',
        {
            ...(projectConfigParser.getConfig('prettier') || {}),
            parser: 'babel-ts',
            plugins: [path.resolve(__dirname, '../node_modules/prettier-plugin-multiline-arrays')],
            filepath: '',
        },
    );
    return code.split(/\r|\n|\r\n/).slice(0, -2).join('\n');
};
