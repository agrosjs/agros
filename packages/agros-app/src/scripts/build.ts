import * as path from 'path';
import * as fs from 'fs-extra';
import { webpack } from 'webpack';
import bfj from 'bfj';
import checkRequiredFiles from 'react-dev-utils/checkRequiredFiles';
import formatWebpackMessages from 'react-dev-utils/formatWebpackMessages';
import printHostingInstructions from 'react-dev-utils/printHostingInstructions';
import FileSizeReporter from 'react-dev-utils/FileSizeReporter';
import printBuildError from 'react-dev-utils/printBuildError';
import { checkBrowsers } from 'react-dev-utils/browsersHelper';
import { Logger } from '@agros/logger';
import { generateBuildConfig } from '../builder/generators';
import paths from '../builder/paths';
// Ensure environment variables are read.
import '../builder/env';

// Do this as the first thing so that any code reading it knows the right env.
process.env.BABEL_ENV = 'production';
process.env.NODE_ENV = 'production';

export default () => {
    const logger = new Logger();

    // Makes the script crash on unhandled rejections instead of silently
    // ignoring them. In the future, promise rejections that are not handled will
    // terminate the Node.js process with a non-zero exit code.
    process.on('unhandledRejection', (err) => {
        throw err;
    });

    const measureFileSizesBeforeBuild = FileSizeReporter.measureFileSizesBeforeBuild;
    const printFileSizesAfterBuild = FileSizeReporter.printFileSizesAfterBuild;
    const useYarn = fs.existsSync(paths.yarnLockFile);

    // These sizes are pretty large. We'll warn for bundles exceeding them.
    const WARN_AFTER_BUNDLE_GZIP_SIZE = 512 * 1024;
    const WARN_AFTER_CHUNK_GZIP_SIZE = 1024 * 1024;

    const isInteractive = process.stdout.isTTY;

    // Warn and crash if required files are missing
    if (!checkRequiredFiles([paths.appHtml, paths.appIndexJs])) {
        process.exit(1);
    }

    const argv = process.argv.slice(2);
    const writeStatsJson = argv.indexOf('--stats') !== -1;
    // Generate configuration
    const config = generateBuildConfig('production');

    // We require that you explicitly set browsers and do not fall back to
    // browserslist defaults.
    checkBrowsers(paths.appPath, isInteractive)
        .then(() => {
        // First, read the current file sizes in build directory.
        // This lets us display how much they changed later.
            return measureFileSizesBeforeBuild(paths.appBuild);
        })
        .then((previousFileSizes) => {
        // Remove all content but keep the directory so that
        // if you're in it, you don't end up in Trash
            fs.emptyDirSync(paths.appBuild);
            // Merge with the public folder
            copyPublicFolder();
            // Start the webpack build
            return build(previousFileSizes);
        })
        .then(
            ({ stats, previousFileSizes, warnings }) => {
                if (warnings.length) {
                    logger.warning('Compiled with warnings.');
                    logger.info(warnings.join('\n\n'));
                    logger.info('\nSearch for the keywords to learn more about each warning.');
                    logger.info('To ignore, add // eslint-disable-next-line to the line before.');
                } else {
                    logger.info('Compiled successfully');
                }

                logger.info('File sizes after gzip:\n');
                printFileSizesAfterBuild(
                    stats,
                    previousFileSizes,
                    paths.appBuild,
                    WARN_AFTER_BUNDLE_GZIP_SIZE,
                    WARN_AFTER_CHUNK_GZIP_SIZE,
                );
                console.log();

                const appPackage = require(paths.appPackageJson);
                const publicUrl = paths.publicUrlOrPath;
                const publicPath = config.output.publicPath;
                const buildFolder = path.relative(process.cwd(), paths.appBuild);
                printHostingInstructions(
                    appPackage,
                    publicUrl,
                    publicPath as string,
                    buildFolder,
                    useYarn,
                );
            },
            (err) => {
                const tscCompileOnError = process.env.TSC_COMPILE_ON_ERROR === 'true';
                if (tscCompileOnError) {
                    logger.warning('Compiled with the following type errors (you may want to check these before deploying your app):');
                    printBuildError(err);
                } else {
                    logger.error('Failed to compile.');
                    printBuildError(err);
                    process.exit(1);
                }
            },
        )
        .catch((e) => {
            if (e?.message) {
                console.log(e.message);
            }
            process.exit(1);
        });

    // Create the production build and print the deployment instructions.
    function build(previousFileSizes) {
        console.log('Creating an optimized production build...');

        const compiler = webpack(config);
        return new Promise((resolve, reject) => {
            compiler.run((err, stats) => {
                let messages;
                if (err) {
                    if (!err.message) {
                        return reject(err);
                    }

                    let errMessage = err.message;

                    // Add additional information for postcss errors
                    if (Object.prototype.hasOwnProperty.call(err, 'postcssNode')) {
                        errMessage += '\nCompileError: Begins at CSS selector ' + err['postcssNode'].selector;
                    }

                    messages = formatWebpackMessages({
                        errors: [errMessage],
                        warnings: [],
                    } as any);
                } else {
                    messages = formatWebpackMessages(
                        stats.toJson({
                            all: false,
                            warnings: true,
                            errors: true,
                        }) as any,
                    );
                }
                if (messages.errors.length) {
                    // Only keep the first error. Others are often indicative
                    // of the same problem, but confuse the reader with noise.
                    if (messages.errors.length > 1) {
                        messages.errors.length = 1;
                    }
                    return reject(new Error(messages.errors.join('\n\n')));
                }
                if (
                    process.env.CI &&
                    (
                        typeof process.env.CI !== 'string' ||
                        process.env.CI.toLowerCase() !== 'false'
                    ) &&
                    messages.warnings.length
                ) {
                    // Ignore sourcemap warnings in CI builds. See #8227 for more info.
                    const filteredWarnings = messages.warnings.filter(
                        (w) => !/Failed to parse source map/.test(w),
                    );
                    if (filteredWarnings.length) {
                        logger.warning('\nTreating warnings as errors because process.env.CI = true.');
                        logger.warning('Most CI servers set it automatically.');
                        return reject(new Error(filteredWarnings.join('\n\n')));
                    }
                }

                const resolveArgs = {
                    stats,
                    previousFileSizes,
                    warnings: messages.warnings,
                };

                if (writeStatsJson) {
                    return bfj
                        .write(paths.appBuild + '/bundle-stats.json', stats.toJson())
                        .then(() => resolve(resolveArgs))
                        .catch((error) => reject(new Error(error)));
                }

                return resolve(resolveArgs);
            });
        });
    }

    function copyPublicFolder() {
        fs.copySync(paths.appPublic, paths.appBuild, {
            dereference: true,
            filter: (file) => file !== paths.appHtml,
        });
    }
};
