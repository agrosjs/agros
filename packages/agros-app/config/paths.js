const path = require('path');
const fs = require('fs');
const { URL } = require('url');

const appDirectory = fs.realpathSync(process.cwd());
const resolveApp = (relativePath) => path.resolve(appDirectory, relativePath);
const publicUrlOrPath = getPublicUrlOrPath(
    process.env.NODE_ENV === 'development',
    require(resolveApp('package.json')).homepage,
    process.env.PUBLIC_URL,
);
const buildPath = process.env.BUILD_PATH || 'build';
const moduleFileExtensions = [
    'web.mjs',
    'mjs',
    'web.js',
    'js',
    'web.ts',
    'ts',
    'web.tsx',
    'tsx',
    'json',
    'web.jsx',
    'jsx',
];

const resolveModule = (resolveFn, filePath) => {
    const extension = moduleFileExtensions.find((extension) =>
        fs.existsSync(resolveFn(`${filePath}.${extension}`)),
    );

    if (extension) {
        return resolveFn(`${filePath}.${extension}`);
    }

    return resolveFn(`${filePath}.js`);
};

/**
 * Returns a URL or a path with slash at the end
 * In production can be URL, abolute path, relative path
 * In development always will be an absolute path
 * In development can use `path` module functions for operations
 *
 * @param {boolean} isEnvDevelopment
 * @param {(string|undefined)} homepage a valid url or pathname
 * @param {(string|undefined)} envPublicUrl a valid url or pathname
 * @returns {string}
 */
function getPublicUrlOrPath(isEnvDevelopment, pathHomepage, publicUrl) {
    const stubDomain = 'https://agros.js.org';
    let envPublicUrl = publicUrl;
    let homepage = pathHomepage;

    if (envPublicUrl) {
        // ensure last slash exists
        envPublicUrl = envPublicUrl.endsWith('/') ? envPublicUrl : envPublicUrl + '/';
        // validate if `envPublicUrl` is a URL or path like
        // `stubDomain` is ignored if `envPublicUrl` contains a domain
        const validPublicUrl = new URL(envPublicUrl, stubDomain);

        return isEnvDevelopment
            ? envPublicUrl.startsWith('.') ? '/' : validPublicUrl.pathname
            :
            // Some apps do not use client-side routing with pushState.
            // For these, "homepage" can be set to "." to enable relative asset paths.
            envPublicUrl;
    }

    if (homepage) {
        // strip last slash if exists
        homepage = homepage.endsWith('/') ? homepage : homepage + '/';

        // validate if `homepage` is a URL or path like and use just pathname
        const validHomepagePathname = new URL(homepage, stubDomain).pathname;
        return isEnvDevelopment
            ? homepage.startsWith('.') ? '/' : validHomepagePathname
            :
            // Some apps do not use client-side routing with pushState.
            // For these, "homepage" can be set to "." to enable relative asset paths.
            homepage.startsWith('.') ? homepage : validHomepagePathname;
    }

    return '/';
}

module.exports = {
    dotenv: resolveApp('.env'),
    appPath: resolveApp('.'),
    appBuild: resolveApp(buildPath),
    appPublic: resolveApp('public'),
    appHtml: resolveApp('public/index.html'),
    appIndexJs: resolveModule(resolveApp, 'src/index'),
    appPackageJson: resolveApp('package.json'),
    appSrc: resolveApp('src'),
    appTsConfig: resolveApp('tsconfig.json'),
    appJsConfig: resolveApp('jsconfig.json'),
    yarnLockFile: resolveApp('yarn.lock'),
    testsSetup: resolveModule(resolveApp, 'src/setupTests'),
    proxySetup: resolveApp('src/setupProxy.js'),
    appNodeModules: resolveApp('node_modules'),
    appWebpackCache: resolveApp('node_modules/.cache'),
    appTsBuildInfoFile: resolveApp('node_modules/.cache/tsconfig.tsbuildinfo'),
    swSrc: resolveModule(resolveApp, 'src/service-worker'),
    publicUrlOrPath,
};

module.exports.moduleFileExtensions = moduleFileExtensions;
