const { defineBuilderConfig } = require('@agros/tools/lib/builder-config');
const {
    addBabelPreset,
    addBabelPlugin,
} = require('@agros/tools/lib/customizers');
const sveltePreprocess = require('svelte-preprocess');
const autoprefixer = require('autoprefixer');
const path = require('path');

module.exports = {
    bundlessPlatform: './lib/bundless-platform.js',
    files: {
        generate: {
            componentDeclaration: path.resolve(__dirname, './files/generate/component.ts._'),
            componentDescription: path.resolve(__dirname, './files/generate/component.svelte._'),
        },
    },
    configWebpack: defineBuilderConfig((config) => {
        addBabelPreset(require.resolve('@babel/preset-env'))(config);
        addBabelPlugin(require.resolve('@babel/plugin-transform-typescript'))(config);
        addBabelPlugin(require.resolve('@babel/plugin-transform-runtime'))(config);
        addBabelPlugin(require.resolve('@babel/plugin-transform-parameters'))(config);

        config.module?.rules?.unshift({
            test: /\.svelte$/,
            use: [
                {
                    loader: require.resolve('svelte-loader'),
                    options: {
                        compilerOptions: {
                        // Dev mode must be enabled for HMR to work!
                            dev: config.mode === 'development',
                        },
                        emitCss: config.mode === 'production',
                        hotReload: config.mode === 'development',
                        hotOptions: {
                        // List of options and defaults: https://www.npmjs.com/package/svelte-loader-hot#usage
                            noPreserveState: false,
                            optimistic: true,
                        },
                        preprocess: sveltePreprocess({
                            scss: true,
                            sass: true,
                            postcss: {
                                plugins: [
                                    autoprefixer,
                                ],
                            },
                        }),
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
            resourceRule?.exclude?.push(/\.svelte$/);
        }

        config.module.rules = config.module?.rules?.map((rule) => {
            if (
                typeof rule.use === 'string' && (
                    rule.use.indexOf('@agros/loader') !== -1 ||
                    rule.use.indexOf(['@agros', 'loader'].join(path.sep)) !== -1 ||
                    rule.use.indexOf(['packages', 'agros-loader'].join(path.sep)) !== -1
                )
            ) {
                return {
                    ...rule,
                    test: /\.(js|jsx|ts|tsx|svelte)$/,
                };
            }
            return rule;
        });

        return config;
    }),
};
