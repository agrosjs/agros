const { defineBuilderConfig } = require('@agros/common/lib/builder-config');
const {
    addBabelPreset,
    getBabelLoader,
    addWebpackPlugin,
} = require('@agros/utils/lib/customizers');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');

const hasJsxRuntime = (() => {
    if (process.env.DISABLE_NEW_JSX_TRANSFORM === 'true') {
        return false;
    }

    try {
        require.resolve('react/jsx-runtime');
        return true;
    } catch (e) {
        return false;
    }
})();

module.exports = defineBuilderConfig((config) => {
    addBabelPreset(
        [
            require.resolve('babel-preset-react-app'),
            {
                runtime: hasJsxRuntime ? 'automatic' : 'classic',
            },
        ],
    )(config);

    const outsideJsBabelLoader = getBabelLoader(config, true);

    if (outsideJsBabelLoader) {
        if (!Array.isArray(outsideJsBabelLoader.options.presets)) {
            outsideJsBabelLoader.options.presets = [];
        }
        outsideJsBabelLoader.options.presets.push(
            [
                require.resolve('babel-preset-react-app/dependencies'),
                {
                    helpers: true,
                },
            ],
        );
    }

    addWebpackPlugin(new ReactRefreshWebpackPlugin({
        overlay: false,
    }))(config);

    return config;
});
