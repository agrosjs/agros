/* eslint-disable @typescript-eslint/explicit-member-accessibility */
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

module.exports = class ForkTsCheckerWarningWebpackPlugin {
    apply(compiler) {
        new ForkTsCheckerWebpackPlugin().apply(compiler);

        const hooks = ForkTsCheckerWebpackPlugin.getCompilerHooks(compiler);

        hooks.issues.tap('ForkTsCheckerWarningWebpackPlugin', (issues) =>
            issues.map((issue) => ({
                ...issue,
                severity: 'warning',
            })),
        );
    }
};
