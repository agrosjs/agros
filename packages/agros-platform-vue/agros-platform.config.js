const { defineBuilderConfig } = require('@agros/common/lib/builder-config');
const {
    addBabelPreset,
    addBabelPlugin,
} = require('@agros/utils/lib/customizers');

module.exports = defineBuilderConfig((config) => {
    addBabelPreset(require.resolve('@babel/preset-env'))(config);
    addBabelPreset(require.resolve('@vue/babel-preset-app'))(config);
    addBabelPlugin(require.resolve('@babel/plugin-transform-typescript'))(config);
    addBabelPlugin(require.resolve('@babel/plugin-transform-runtime'))(config);
    addBabelPlugin(require.resolve('@babel/plugin-transform-parameters'))(config);

    config.module?.rules?.push({
        test: /\.vue$/,
        use: require.resolve('./lib/loaders/component-file.loader.js'),
    });

    return config;
});
