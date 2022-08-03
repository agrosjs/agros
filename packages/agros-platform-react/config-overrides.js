const {
    override,
    removeModuleScopePlugin,
    addBabelPlugins,
    addWebpackAlias,
} = require('customize-cra');
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
        addWebpackAlias(projectConfigParser.getAlias()),
        (config) => {
            config?.module?.rules?.push({
                test: /(\.ts|\.tsx)$/,
                use: [require.resolve('@agros/loader')],
            });
            return config;
        },
        (config) => {
            config.entry = projectConfigParser.getEntry();
            return config;
        },
        ...projectConfigParser.getPlatformConfig('builder') || [],
    ),
    devServer: projectConfigParser.getPlatformConfig('devServer') || ((config) => config),
};
