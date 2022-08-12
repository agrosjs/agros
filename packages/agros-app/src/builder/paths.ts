import * as fs from 'fs';
import * as path from 'path';
import { URL } from 'url';

const resolveModules = (() => {
    const getNodeModulesDir = (startPath = fs.realpathSync(process.cwd())) => {
        if (!startPath || path.dirname(startPath) === startPath) {
            return null;
        }

        const absoluteFilePath = path.resolve(startPath, 'node_modules');

        if (!fs.existsSync(absoluteFilePath)) {
            return getNodeModulesDir(path.dirname(startPath));
        } else {
            return path.dirname(absoluteFilePath);
        }
    };

    const nodeModulesDir = getNodeModulesDir();

    return (relativePath = '') => {
        return path.resolve(nodeModulesDir, relativePath);
    };
})();
const resolveApp = (() => {
    const appDir = process.cwd();
    return (relativePath: string) => path.resolve(appDir, relativePath);
})();
const publicUrlOrPath = getPublicUrlOrPath(
    process.env.NODE_ENV === 'development',
    require(resolveModules('package.json')).homepage,
    process.env.PUBLIC_URL,
);
const buildPath = process.env.BUILD_PATH || 'build';

export const moduleFileExtensions = [
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

const paths = {
    dotenv: resolveApp('.env'),
    appPath: resolveApp('.'),
    appBuild: resolveApp(buildPath),
    appPublic: resolveApp('public'),
    appHtml: resolveApp('public/index.html'),
    appIndexJs: resolveModule(resolveApp, 'src/index'),
    appPackageJson: resolveModules('package.json'),
    appSrc: resolveApp('src'),
    appTsConfig: resolveApp('tsconfig.json'),
    appJsConfig: resolveApp('jsconfig.json'),
    yarnLockFile: resolveApp('yarn.lock'),
    testsSetup: resolveModule(resolveApp, 'src/setupTests'),
    proxySetup: resolveApp('src/setupProxy.js'),
    appNodeModules: resolveModules(),
    appWebpackCache: resolveModules('.cache'),
    appTsBuildInfoFile: resolveModules() + '.cache/tsconfig.tsbuildinfo',
    swSrc: resolveModule(resolveApp, 'src/service-worker'),
    publicUrlOrPath,
};

export default paths;
