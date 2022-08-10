const { defineBuilderConfig } = require('@agros/common/lib/builder-config');
const {
    addBabelPreset,
    addBabelPlugin,
} = require('@agros/utils/lib/customizers');
const { VueLoaderPlugin } = require('vue-loader');

module.exports = defineBuilderConfig((config) => {
    addBabelPreset(require.resolve('@babel/preset-env'))(config);
    addBabelPreset(require.resolve('@vue/babel-preset-app'))(config);
    addBabelPlugin(require.resolve('@babel/plugin-transform-typescript'))(config);
    addBabelPlugin(require.resolve('@babel/plugin-transform-runtime'))(config);
    addBabelPlugin(require.resolve('@babel/plugin-transform-parameters'))(config);

    config.module?.rules?.unshift({
        test: /\.vue$/,
        use: [
            {
                loader: require.resolve('vue-loader'),
                options: {
                    loaders: {
                        js: require.resolve('awesome-typescript-loader'),
                    },
                },
            },
            require.resolve('./lib/loaders/component-file.loader.js'),
        ],
    });

    let resourceRule = config.module.rules.find((rule) => rule?.type === 'asset/resource');

    if (!resourceRule) {
        resourceRule = config.module.rules.find((rule) => !!rule.oneOf)?.oneOf?.find((rule) => {
            return rule?.type === 'asset/resource';
        });
    }

    if (resourceRule) {
        resourceRule?.exclude?.push(/\.vue$/);
    }

    config.plugins?.push(new VueLoaderPlugin());

    return config;
});
