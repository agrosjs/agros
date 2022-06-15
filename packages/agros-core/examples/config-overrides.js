const {
    override,
    removeModuleScopePlugin,
    addBabelPlugins,
} = require('customize-cra');

module.exports = override(
    removeModuleScopePlugin(),
    ...addBabelPlugins(
        'babel-plugin-transform-typescript-metadata',
        [
            '@babel/plugin-proposal-decorators',
            {
                'legacy': true,
            },
        ],
        [
            '@babel/plugin-proposal-class-properties',
            {
                'loose': true,
            },
        ],
    ),
);
