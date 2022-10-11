import * as fs from 'fs';
import * as path from 'path';
import webpack, {
    Configuration,
    RuleSetRule,
} from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import CaseSensitivePathsPlugin from 'case-sensitive-paths-webpack-plugin';
import WorkboxWebpackPlugin from 'workbox-webpack-plugin';
import createEnvironmentHash from './create-environment-hash';
import paths, { moduleFileExtensions } from './paths';
import modules from './modules';
import { getClientEnvironment } from './env';
import {
    ProjectConfigParser,
    PlatformConfigParser,
} from '@agros/tools/lib/config-parsers';
import { Logger } from '@agros/tools/lib/logger';
import TerserPlugin from 'terser-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin';
import { WebpackManifestPlugin } from 'webpack-manifest-plugin';
import InlineChunkHtmlPlugin from 'react-dev-utils/InlineChunkHtmlPlugin';
import getCSSModuleLocalIdent from 'react-dev-utils/getCSSModuleLocalIdent';
import InterpolateHtmlPlugin from 'react-dev-utils/InterpolateHtmlPlugin';
import getHttpsConfig from './get-https-config';
import evalSourceMapMiddleware from 'react-dev-utils/evalSourceMapMiddleware';
import noopServiceWorkerMiddleware from 'react-dev-utils/noopServiceWorkerMiddleware';
import ignoredFiles from 'react-dev-utils/ignoredFiles';
import redirectServedPath from 'react-dev-utils/redirectServedPathMiddleware';

const configParser = new ProjectConfigParser();
const shouldUseSourceMap = process.env.GENERATE_SOURCEMAP !== 'false';
const shouldInlineRuntimeChunk = process.env.INLINE_RUNTIME_CHUNK !== 'false';
const imageInlineSizeLimit = parseInt(process.env.IMAGE_INLINE_SIZE_LIMIT || '10000', 10);
const useTypeScript = fs.existsSync(paths.appTsConfig);
const useTailwind = fs.existsSync(path.join(paths.appPath, 'tailwind.config.js'));

const swSrc = paths.swSrc;

const cssRegex = /\.css$/;
const cssModuleRegex = /\.module\.css$/;
const sassRegex = /\.(scss|sass)$/;
const sassModuleRegex = /\.module\.(scss|sass)$/;
const lessRegex = /\.less$/;
const lessModuleRegex = /\.module\.less$/;

export const generateBuildConfig = (webpackEnv) => {
    const logger = new Logger();
    const isEnvDevelopment = webpackEnv === 'development';
    const isEnvProduction = webpackEnv === 'production';
    const isEnvProductionProfile = isEnvProduction && process.argv.includes('--profile');
    const env = getClientEnvironment(paths.publicUrlOrPath.slice(0, -1));
    const getStyleLoaders = (cssOptions, preProcessor = '') => {
        const loaders = [
            isEnvDevelopment && require.resolve('style-loader'),
            isEnvProduction && {
                loader: MiniCssExtractPlugin.loader,
                options: paths.publicUrlOrPath.startsWith('.')
                    ? {
                        publicPath: '../../',
                    }
                    : {},
            },
            {
                loader: require.resolve('css-loader'),
                options: cssOptions,
            },
            {
                loader: require.resolve('postcss-loader'),
                options: {
                    postcssOptions: {
                        ident: 'postcss',
                        config: false,
                        plugins: !useTailwind
                            ? [
                                'postcss-flexbugs-fixes',
                                [
                                    'postcss-preset-env',
                                    {
                                        autoprefixer: {
                                            flexbox: 'no-2009',
                                        },
                                        stage: 3,
                                    },
                                ],
                                'postcss-normalize',
                            ]
                            : [
                                'tailwindcss',
                                'postcss-flexbugs-fixes',
                                [
                                    'postcss-preset-env',
                                    {
                                        autoprefixer: {
                                            flexbox: 'no-2009',
                                        },
                                        stage: 3,
                                    },
                                ],
                            ],
                    },
                    sourceMap: isEnvProduction ? shouldUseSourceMap : isEnvDevelopment,
                },
            },
        ].filter(Boolean);
        if (preProcessor) {
            loaders.push(
                {
                    loader: require.resolve('resolve-url-loader'),
                    options: {
                        sourceMap: isEnvProduction ? shouldUseSourceMap : isEnvDevelopment,
                        root: paths.appSrc,
                    },
                },
                {
                    loader: require.resolve(preProcessor),
                    options: {
                        sourceMap: true,
                    },
                },
            );
        }
        return loaders;
    };

    let config: Configuration = {
        ignoreWarnings: [
            () => true,
        ],
        target: ['browserslist'],
        stats: 'errors-only',
        mode: isEnvProduction ? 'production' : isEnvDevelopment ? 'development' : 'none',
        bail: isEnvProduction,
        devtool: isEnvProduction
            ? shouldUseSourceMap ? 'source-map' : false
            : isEnvDevelopment && 'cheap-module-source-map',
        entry: configParser.getEntry() || 'src/index.ts',
        output: {
            path: paths.appBuild,
            pathinfo: isEnvDevelopment,
            filename: isEnvProduction
                ? 'static/js/[name].[contenthash:8].js'
                : isEnvDevelopment && 'static/js/bundle.js',
            chunkFilename: isEnvProduction
                ? 'static/js/[name].[contenthash:8].chunk.js'
                : isEnvDevelopment && 'static/js/[name].chunk.js',
            assetModuleFilename: 'static/media/[name].[hash][ext]',
            publicPath: paths.publicUrlOrPath,
            devtoolModuleFilenameTemplate: isEnvProduction
                ? (info) => path.relative(paths.appSrc, info.absoluteResourcePath).replace(/\\/g, '/')
                : isEnvDevelopment &&
          ((info) => path.resolve(info.absoluteResourcePath).replace(/\\/g, '/')),
        },
        cache: {
            type: 'filesystem',
            version: createEnvironmentHash(env.raw),
            cacheDirectory: paths.appWebpackCache,
            store: 'pack',
            buildDependencies: {
                defaultWebpack: ['webpack/lib/'],
                config: [__filename],
                tsconfig: [paths.appTsConfig, paths.appJsConfig].filter((f) =>
                    fs.existsSync(f),
                ),
            },
        },
        infrastructureLogging: {
            level: 'none',
        },
        optimization: {
            minimize: isEnvProduction,
            minimizer: [
                new TerserPlugin({
                    terserOptions: {
                        parse: {
                            ecma: 2017,
                        },
                        compress: {
                            ecma: 5,
                            warnings: false,
                            comparisons: false,
                            inline: 2,
                        },
                        mangle: {
                            safari10: true,
                        },
                        keep_classnames: isEnvProductionProfile,
                        keep_fnames: isEnvProductionProfile,
                        output: {
                            ecma: 5,
                            comments: false,
                            ascii_only: true,
                        },
                    },
                }),
                new CssMinimizerPlugin(),
            ],
        },
        resolve: {
            modules: ['node_modules', paths.appNodeModules].concat(
                modules.additionalModulePaths || [],
            ),
            extensions: moduleFileExtensions
                .map((ext) => `.${ext}`)
                .filter((ext) => useTypeScript || !ext.includes('ts')),
            alias: {
                ...(modules.webpackAliases || {}),
                ...(configParser.getAlias() || {}),
            },
            plugins: [],
        },
        module: {
            strictExportPresence: true,
            rules: [
                shouldUseSourceMap && {
                    enforce: 'pre',
                    exclude: /@babel(?:\/|\\{1,2})runtime/,
                    test: /\.(js|mjs|jsx|ts|tsx|css)$/,
                    loader: require.resolve('source-map-loader'),
                },
                {
                    oneOf: [
                        {
                            test: [/\.avif$/],
                            type: 'asset',
                            mimetype: 'image/avif',
                            parser: {
                                dataUrlCondition: {
                                    maxSize: imageInlineSizeLimit,
                                },
                            },
                        },
                        {
                            test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
                            type: 'asset',
                            parser: {
                                dataUrlCondition: {
                                    maxSize: imageInlineSizeLimit,
                                },
                            },
                        },
                        {
                            test: /\.svg$/,
                            use: [
                                {
                                    loader: require.resolve('@svgr/webpack'),
                                    options: {
                                        prettier: false,
                                        svgo: false,
                                        svgoConfig: {
                                            plugins: [{ removeViewBox: false }],
                                        },
                                        titleProp: true,
                                        ref: true,
                                    },
                                },
                                {
                                    loader: require.resolve('file-loader'),
                                    options: {
                                        name: 'static/media/[name].[hash].[ext]',
                                    },
                                },
                            ],
                            issuer: {
                                and: [/\.(ts|tsx|js|jsx|md|mdx)$/],
                            },
                        },
                        {
                            test: /\.(js|mjs|jsx|ts|tsx)$/,
                            include: paths.appSrc,
                            loader: require.resolve('babel-loader'),
                            options: {
                                presets: [],
                                plugins: [
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
                                ].filter(Boolean),
                                cacheDirectory: true,
                                cacheCompression: false,
                                compact: isEnvProduction,
                            },
                        },
                        {
                            test: /\.(js|mjs)$/,
                            exclude: /@babel(?:\/|\\{1,2})runtime/,
                            loader: require.resolve('babel-loader'),
                            options: {
                                babelrc: false,
                                configFile: false,
                                compact: false,
                                presets: [],
                                cacheDirectory: true,
                                cacheCompression: false,
                                sourceMaps: shouldUseSourceMap,
                                inputSourceMap: shouldUseSourceMap,
                            },
                        },
                        {
                            test: cssRegex,
                            exclude: cssModuleRegex,
                            use: getStyleLoaders({
                                importLoaders: 1,
                                sourceMap: isEnvProduction
                                    ? shouldUseSourceMap
                                    : isEnvDevelopment,
                                modules: {
                                    mode: 'icss',
                                },
                            }),
                            sideEffects: true,
                        },
                        {
                            test: cssModuleRegex,
                            use: getStyleLoaders({
                                importLoaders: 1,
                                sourceMap: isEnvProduction
                                    ? shouldUseSourceMap
                                    : isEnvDevelopment,
                                modules: {
                                    mode: 'local',
                                    getLocalIdent: getCSSModuleLocalIdent,
                                },
                            }),
                        },
                        {
                            test: sassRegex,
                            exclude: sassModuleRegex,
                            use: getStyleLoaders(
                                {
                                    importLoaders: 3,
                                    sourceMap: isEnvProduction
                                        ? shouldUseSourceMap
                                        : isEnvDevelopment,
                                    modules: {
                                        mode: 'icss',
                                    },
                                },
                                require.resolve('sass-loader'),
                            ),
                            sideEffects: true,
                        },
                        {
                            test: sassModuleRegex,
                            use: getStyleLoaders(
                                {
                                    importLoaders: 3,
                                    sourceMap: isEnvProduction
                                        ? shouldUseSourceMap
                                        : isEnvDevelopment,
                                    modules: {
                                        mode: 'local',
                                        getLocalIdent: getCSSModuleLocalIdent,
                                    },
                                },
                                require.resolve('sass-loader'),
                            ),
                        },
                        {
                            test: lessRegex,
                            exclude: lessModuleRegex,
                            use: getStyleLoaders(
                                {
                                    importLoaders: 3,
                                    sourceMap: isEnvProduction
                                        ? shouldUseSourceMap
                                        : isEnvDevelopment,
                                    modules: {
                                        mode: 'icss',
                                    },
                                },
                                require.resolve('less-loader'),
                            ),
                            sideEffects: true,
                        },
                        {
                            test: lessModuleRegex,
                            use: getStyleLoaders(
                                {
                                    importLoaders: 3,
                                    sourceMap: isEnvProduction
                                        ? shouldUseSourceMap
                                        : isEnvDevelopment,
                                    modules: {
                                        mode: 'local',
                                        getLocalIdent: getCSSModuleLocalIdent,
                                    },
                                },
                                require.resolve('less-loader'),
                            ),
                        },
                        {
                            exclude: [
                                /^$/,
                                /\.(js|cjs|mjs|jsx|ts|tsx)$/,
                                /\.html$/,
                                /\.json$/,
                                /@agros/,
                            ],
                            type: 'asset/resource',
                        },
                    ],
                },
                {
                    test: /\.(js|jsx|ts|tsx)$/,
                    include: [paths.appPath],
                    use: require.resolve('@agros/loader') + '?factory_file=__AGROS_FACTORY_FILE_' + Math.random().toString(32).slice(2) + '__',
                },
            ].filter(Boolean) as RuleSetRule[],
        },
        plugins: [
            new HtmlWebpackPlugin(
                {
                    inject: true,
                    template: paths.appHtml,
                    ...(isEnvProduction
                        ? {
                            minify: {
                                removeComments: true,
                                collapseWhitespace: true,
                                removeRedundantAttributes: true,
                                useShortDoctype: true,
                                removeEmptyAttributes: true,
                                removeStyleLinkTypeAttributes: true,
                                keepClosingSlash: true,
                                minifyJS: true,
                                minifyCSS: true,
                                minifyURLs: true,
                            },
                        }
                        : undefined),
                },
            ),
            isEnvProduction && shouldInlineRuntimeChunk && new InlineChunkHtmlPlugin(HtmlWebpackPlugin as any, [/runtime-.+[.]js/]),
            new InterpolateHtmlPlugin(HtmlWebpackPlugin as any, env.raw as any),
            new webpack.DefinePlugin(env.stringified),
            isEnvDevelopment && new CaseSensitivePathsPlugin(),
            isEnvProduction && new MiniCssExtractPlugin({
                filename: 'static/css/[name].[contenthash:8].css',
                chunkFilename: 'static/css/[name].[contenthash:8].chunk.css',
            }),
            new WebpackManifestPlugin({
                fileName: 'asset-manifest.json',
                publicPath: paths.publicUrlOrPath,
                generate: (seed, files, entrypoints) => {
                    const manifestFiles = files.reduce((manifest, file) => {
                        manifest[file.name] = file.path;
                        return manifest;
                    }, seed);
                    const entrypointFiles = entrypoints.main.filter(
                        (fileName) => !fileName.endsWith('.map'),
                    );

                    return {
                        files: manifestFiles,
                        entrypoints: entrypointFiles,
                    };
                },
            }),
            new webpack.IgnorePlugin({
                resourceRegExp: /^\.\/locale$/,
                contextRegExp: /moment$/,
            }),
            isEnvProduction && fs.existsSync(swSrc) && new WorkboxWebpackPlugin.InjectManifest({
                swSrc,
                dontCacheBustURLsMatching: /\.[0-9a-f]{8}\./,
                exclude: [/\.map$/, /asset-manifest\.json$/, /LICENSE/],
                maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
            }),
        ].filter(Boolean),
        performance: false,
    };

    try {
        const platformConfigParser = new PlatformConfigParser(configParser.getConfig<string>('platform'));
        const configFactory = platformConfigParser.getPlatformWebpackConfigFactory();
        if (typeof configFactory === 'function') {
            const currentConfig = configFactory(config);
            if (currentConfig) {
                config = currentConfig;
            }
        }
    } catch (e) {
        logger.warning(`Build config error: ${e.message || e.toString()}`);
    }

    try {
        const configWebpack = configParser.getConfig('configWebpack');

        if (typeof configWebpack === 'function') {
            const currentConfig = configWebpack(config);
            if (currentConfig) {
                config = currentConfig;
            }
        }
    } catch (e) {}

    return config;
};

export const generateDevServerConfig = (proxy, allowedHost) => {
    const host = process.env.HOST || '0.0.0.0';
    const sockHost = process.env.WDS_SOCKET_HOST;
    const sockPath = process.env.WDS_SOCKET_PATH;
    const sockPort = process.env.WDS_SOCKET_PORT;
    const disableFirewall = !proxy || process.env.DANGEROUSLY_DISABLE_HOST_CHECK === 'true';
    const configParser = new ProjectConfigParser();
    const configWebpackDevServer = configParser.getConfig('configWebpackDevServer');
    let devServerConfig = {
        allowedHosts: disableFirewall ? 'all' : [allowedHost],
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': '*',
            'Access-Control-Allow-Headers': '*',
        },
        compress: true,
        static: {
            directory: paths.appPublic,
            publicPath: [paths.publicUrlOrPath],
            watch: {
                ignored: ignoredFiles(paths.appSrc),
            },
        },
        client: {
            webSocketURL: {
                hostname: sockHost,
                pathname: sockPath,
                port: sockPort,
            },
            overlay: {
                errors: true,
                warnings: false,
            },
        },
        devMiddleware: {
            publicPath: paths.publicUrlOrPath.slice(0, -1),
        },
        https: getHttpsConfig(),
        host,
        historyApiFallback: {
            disableDotRule: true,
            index: paths.publicUrlOrPath,
        },
        proxy,
        setupMiddlewares(middlewares, devServer) {
            if (!devServer) {
                throw new Error('webpack-dev-server is not defined');
            }

            if (!Array.isArray(middlewares)) {
                throw new Error('webpack-dev-server middlewares is not an array');
            }

            middlewares.unshift(evalSourceMapMiddleware(devServer));

            if (fs.existsSync(paths.proxySetup)) {
                require(paths.proxySetup)(devServer.app);
            }

            middlewares.push(redirectServedPath(paths.publicUrlOrPath));
            middlewares.push(noopServiceWorkerMiddleware(paths.publicUrlOrPath));
        },
    };

    try {
        if (typeof configWebpackDevServer === 'function') {
            const currentConfig = configWebpackDevServer(devServerConfig);
            if (currentConfig) {
                devServerConfig = currentConfig;
            }
        }
    } catch (e) {}

    return devServerConfig;
};
