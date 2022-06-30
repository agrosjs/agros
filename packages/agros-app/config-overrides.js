const {
    override,
    removeModuleScopePlugin,
    addBabelPlugins,
} = require('./lib/scripts/customize');
const { ProjectConfigParser } = require('@agros/config');

const projectConfigParser = new ProjectConfigParser();

module.exports = {
    webpack: override(
        removeModuleScopePlugin(),
        ...addBabelPlugins(
            require.resolve('babel-plugin-transform-typescript-metadata'),
            [
                require.resolve('@babel/plugin-proposal-decorators'),
                {
                    'legacy': true,
                },
            ],
            [
                require.resolve('@babel/plugin-proposal-class-properties'),
                {
                    'loose': true,
                },
            ],
        ),
        (config) => {
            config?.module?.rules?.push({
                test: /(\.ts|\.tsx)$/,
                use: [require.resolve('@agros/loader')],
            });
            return config;
        },
        ...projectConfigParser.getConfig('builder'),
    ),
    devServer: projectConfigParser.getConfig('devServer'),
};
