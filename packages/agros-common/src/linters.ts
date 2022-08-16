import { cosmiconfigSync } from 'cosmiconfig';
import { ESLint } from 'eslint';
import _ from 'lodash';
import * as path from 'path';
import * as fs from 'fs';
import prettier from 'prettier';
import { getESLintIndentSize } from './utils';

export type LinterPlugin = (code: string, fromPath: string) => Promise<string>;
export interface LinterOptions extends ESLint.Options {
    prePlugins?: LinterPlugin[];
    postPlugins?: LinterPlugin[];
}

export const lintCode = async (
    code: string,
    options: LinterOptions = {},
): Promise<string> => {
    const {
        cwd: userSpecifiedCwd,
        prePlugins = [],
        postPlugins = [],
        overrideConfig = {},
        ...otherESLintConfig
    } = options;
    let eslintConfigFilePath = userSpecifiedCwd;

    if (!eslintConfigFilePath) {
        const eslintConfigPaths = [
            path.resolve(process.cwd(), 'node_modules/@agros/config/.eslintrc.js'),
            path.resolve(__dirname, '../node_modules/@agros/config/.eslintrc.js'),
        ];
        const currentProjectESLintConfig = cosmiconfigSync('eslint').search();
        eslintConfigFilePath = currentProjectESLintConfig?.filepath
            ? currentProjectESLintConfig.filepath
            : eslintConfigPaths.find((pathname) => fs.existsSync(pathname));
    }

    if (!eslintConfigFilePath) {
        return code;
    }

    const eslint = new ESLint({
        ...otherESLintConfig,
        allowInlineConfig: true,
        cwd: path.dirname(eslintConfigFilePath),
        overrideConfig: _.merge({}, {
            rules: {
                'array-element-newline': ['error', {
                    'multiline': true,
                    'minItems': 2,
                }],
                'array-bracket-newline': ['error', {
                    'multiline': true,
                    'minItems': 2,
                }],
                'object-curly-newline': ['error', {
                    'ObjectExpression': 'always',
                    'ObjectPattern': 'always',
                    'ImportDeclaration': {
                        'multiline': true,
                        'minProperties': 2,
                    },
                    'ExportDeclaration': {
                        'multiline': true,
                        'minProperties': 2,
                    },
                }],
                'object-curly-spacing': ['error', 'always'],
                'object-property-newline': ['error', { allowAllPropertiesOnSameLine: false }],
                'no-undef': 'off',
                'no-unused-vars': 'off',
            },
        }, overrideConfig),
        fix: true,
    });
    let rawCode: string = code;

    for (const prePlugin of prePlugins) {
        rawCode = await prePlugin(rawCode, eslintConfigFilePath);
    }

    rawCode = _.get(await eslint.lintText(rawCode), '[0].output') as string || rawCode;

    for (const postPlugin of postPlugins) {
        rawCode = await postPlugin(rawCode, eslintConfigFilePath);
    }

    return rawCode;
};

export const lintWithPrettier = async (code: string, fromPath = process.cwd()) => {
    const tabWidth = getESLintIndentSize(fromPath);
    return prettier.format(code, {
        parser: 'typescript',
        tabWidth,
    });
};
