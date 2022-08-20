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
                loader: require.resolve('./lib/loaders/vue-loader.js'),
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
    config.module.rules = config.module?.rules?.map((rule) => {
        if (
            typeof rule.use === 'string' && (
                rule.use.indexOf('@agros/loader') !== -1 ||
                /packages\/agros-loader/.test(rule.use)
            )
        ) {
            return {
                ...rule,
                test: /\.(js|jsx|ts|tsx|vue)$/,
            };
        }
        return rule;
    });

    return config;
});
