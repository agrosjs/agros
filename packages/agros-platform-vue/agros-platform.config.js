const { defineBuilderConfig } = require('@agros/tools/lib/builder-config');
const {
    addBabelPreset,
    addBabelPlugin,
} = require('@agros/tools/lib/customizers');
const { VueLoaderPlugin } = require('vue-loader');
const path = require('path');

module.exports = {
    bundlessPlatform: './lib/bundless-platform.js',
    files: {
        generate: {
            componentDeclaration: path.resolve(__dirname, './files/generate/component.ts._'),
            componentDescription: path.resolve(__dirname, './files/generate/component.vue._'),
        },
    },
    configWebpack: defineBuilderConfig((config) => {
        addBabelPreset([
            require.resolve('@babel/preset-env'),
            {
                loose: true,
            },
        ])(config);
        addBabelPreset([require.resolve('@vue/babel-preset-app'), {
            loose: true,
        }])(config);
        addBabelPlugin([require.resolve('@babel/plugin-transform-typescript'), {
            loose: true,
        }])(config);
        addBabelPlugin([require.resolve('@babel/plugin-transform-runtime'), {
            loose: true,
        }])(config);
        addBabelPlugin([require.resolve('@babel/plugin-transform-parameters'), {
            loose: true,
        }])(config);

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
    }),
};
