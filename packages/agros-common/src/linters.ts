import { cosmiconfigSync } from 'cosmiconfig';
import { ESLint } from 'eslint';
import _ from 'lodash';
import * as path from 'path';
import * as fs from 'fs';

export type LinterPlugin = (code: string) => Promise<string>;

export const lintCode = async (
    code: string,
    prePlugins: LinterPlugin[] = [],
    postPlugins: LinterPlugin[] = [],
): Promise<string> => {
    const eslintConfigPaths = [
        path.resolve(process.cwd(), 'node_modules/@agros/config/.eslintrc.js'),
        path.resolve(__dirname, '../node_modules/@agros/config/.eslintrc.js'),
    ];
    const currentProjectESLintConfig = cosmiconfigSync('eslint').search();
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

    const lintResultList = await eslint.lintText(code);

    return _.get(lintResultList, '[0].output') || code;
};
