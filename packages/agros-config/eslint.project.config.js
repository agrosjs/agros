const path = require('path');

module.exports = {
    parser: path.resolve(__dirname, './node_modules/@typescript-eslint/parser'),
    plugins: [
        path.resolve(__dirname, './node_modules/@typescript-eslint/eslint-plugin'),
    ],
    root: true,
    env: {
        node: true,
        jest: true,
    },
    rules: {
        'react/react-in-jsx-scope': 'off',
        semi: ['error', 'always'],
        'comma-dangle': ['error', 'always-multiline'],
        'switch-colon-spacing': ['error', {
            'after': true,
            'before': false,
        }],
        quotes: ['error', 'single'],
        indent: ['error', 4, {
            SwitchCase: 1,
        }],
        'eol-last': ['error', 'always'],
        'space-infix-ops': 'off',
        'max-nested-callbacks': 'off',
        'max-params': 'off',
        'prefer-regex-literals': 'off',
        'no-unused-vars': 'error',
        'no-useless-call': 'off',
        'complexity': 'off',
        'no-new-func': 'off',
        'comma-spacing': ['error', {
            'before': false,
            'after': true,
        }],
        'arrow-parens': ['error', 'always'],
        'keyword-spacing': [
            'error',
            {
                'before': true,
                'after': true,
            },
        ],
        'key-spacing': [2, {
            'beforeColon': false,
            'afterColon': true,
            'mode': 'strict',
        }],
        'no-multiple-empty-lines': ['error', {
            'max': 1,
            'maxEOF': 1,
        }],
        '@typescript-eslint/semi': ['error', 'always'],
        '@typescript-eslint/space-infix-ops': ['error', {
            'int32Hint': true,
        }],
        '@typescript-eslint/interface-name-prefix': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/ban-types': 'off',
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/consistent-type-assertions': 'off',
        '@typescript-eslint/no-require-imports': 'off',
        '@typescript-eslint/no-parameter-properties': 'off',
        '@typescript-eslint/type-annotation-spacing': [
            'error',
            {
                'before': true,
                'after': true,
                'overrides': {
                    'colon': {
                        'before': false,
                        'after': true,
                    },
                },
            },
        ],
    },
};
