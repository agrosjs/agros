import generate from '@babel/generator';
import * as t from '@babel/types';
import * as path from 'path';
import { ESLint } from 'eslint';
import { cosmiconfigSync } from 'cosmiconfig';
import * as fs from 'fs';
import _ from 'lodash';

export const generateDecoratorCode = async (ast: t.Node): Promise<string> => {
    const CLASS_PLACEHOLDER = 'class AgrosPlaceholder {}';
    const eslintConfigPaths = [
        path.resolve(process.cwd(), 'node_modules/@agros/config/.eslintrc.js'),
        path.resolve(__dirname, '../node_modules/@agros/config/.eslintrc.js'),
    ];
    const currentProjectESLintConfig = cosmiconfigSync('eslint').search();
    const rawCode = generate(ast as any).code + '\n' + CLASS_PLACEHOLDER;
    const eslintConfigFilePath = currentProjectESLintConfig?.filepath
        ? currentProjectESLintConfig.filepath
        : eslintConfigPaths.find((pathname) => fs.existsSync(pathname));
    const eslint = new ESLint({
        allowInlineConfig: true,
        cwd: path.dirname(eslintConfigFilePath),
        overrideConfig: {
            rules: {
                'array-element-newline': ['error', 'always'],
                'array-bracket-newline': ['error', 'always'],
                'no-undef': 'off',
                'no-unused-vars': 'off',
            },
        },
        fix: true,
    });

    const lintResultList = await eslint.lintText(rawCode);

    const codeLines = _.get(lintResultList, '[0].output').split(/\r|\n|\r\n/);
    return codeLines.slice(0, codeLines.indexOf(CLASS_PLACEHOLDER)).join('\n');
};
