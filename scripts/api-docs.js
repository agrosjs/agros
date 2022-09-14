/* eslint-disable @typescript-eslint/prefer-optional-chain */
const path = require('path');
const fs = require('fs-extra');
const _ = require('lodash');
const { spawn } = require('child_process');
const glob = require('glob');
const { Octokit } = require('octokit');
const axios = require('axios').default;
const semver = require('semver');

const octokit = new Octokit({
    auth: process.env.GITHUB_ACCESS_TOKEN,
});
const GIT_USER = 'agrosjs';
const GIT_REPO = 'agrosjs.github.io';
const GIT_BRANCH = 'master';

const createVersionedDocs = async (baseTree) => {
    if (!Array.isArray(baseTree) || baseTree.length === 0) {
        return;
    }

    try {
        const packageJson = fs.readJsonSync(
            path.resolve(__dirname, '../packages/agros-app/package.json'),
        );
        const newAppVersion = packageJson.version;

        if (!newAppVersion) {
            console.log('Warn: cannot read version of `@agros/app`');
            return;
        }

        const { data: appPackageInfo } = await axios.get('https://registry.npmjs.org/@agros/app', {
            responseType: 'json',
        });
        const versions = Object.keys((appPackageInfo || {}).versions || {});
        const lastVersion = versions.pop();

        console.log(`Got new version: ${newAppVersion}, latest version: ${lastVersion}`);

        if (
            !semver.lt(
                lastVersion.split('.').slice(0, 2).join('.') + '.0',
                newAppVersion.split('.').slice(0, 2).join('.') + '.0',
            )
        ) {
            console.log('New version and the latest one has the same minor version, nothing to do');
            return;
        }

        const newDocsVersion = newAppVersion.split('.').slice(0, 2).join('.') + '.x';
        const versionedDocsPath = `versioned_docs/version-${newDocsVersion}`;
        console.log('Found new version ' + newAppVersion + ', generating docs version ' + newDocsVersion);
        const newBaseTree = baseTree.filter((tree) => {
            return !tree.path.startsWith(versionedDocsPath);
        }).concat(
            baseTree.filter((tree) => {
                return tree.path.startsWith('docs');
            }).map((tree) => {
                return {
                    ...tree,
                    path: path.join(
                        versionedDocsPath,
                        path.relative('docs', tree.path),
                    ),
                };
            }),
        );
        console.log('Creating new versions.json blob...');
        const versionsJsonBlobIndex = newBaseTree.findIndex((tree) => tree.path === 'versions.json');

        if (versionsJsonBlobIndex !== -1) {
            console.log('Found versions.json, process update...');
            try {
                const { data: versionsJsonBlobContent } = await octokit.request(
                    'GET /repos/{owner}/{repo}/git/blobs/{file_sha}',
                    {
                        owner: GIT_USER,
                        repo: GIT_REPO,
                        file_sha: newBaseTree[versionsJsonBlobIndex].sha,
                    },
                );
                const versionJson = JSON.parse(Buffer.from(versionsJsonBlobContent?.content, 'base64').toString());
                console.log('Got versions.json content: ', versionJson);
                console.log('Updating blob...');
                const content = JSON.stringify(_.uniq(versionJson.concat(newDocsVersion)), null, 4);
                if (Array.isArray(versionJson)) {
                    const {
                        data: updatedVersionsJsonBlob,
                    } = await octokit.request('POST https://api.github.com/repos/{user}/{repo}/git/blobs', {
                        user: GIT_USER,
                        repo: GIT_REPO,
                        content,
                        encoding: 'utf-8',
                    });
                    console.log('Create new version.json blob: ', updatedVersionsJsonBlob);
                    if ((updatedVersionsJsonBlob || {}).sha) {
                        newBaseTree.splice(
                            versionsJsonBlobIndex,
                            1,
                            {
                                mode: '100644',
                                type: 'blob',
                                path: 'versions.json',
                                sha: (updatedVersionsJsonBlob || {}).sha,
                            },
                        );
                        console.log('Successfully updated versions.json: ', content);
                    }
                }
                console.log('Update versions.json finished');
            } catch (e) {
                console.log('Warn: cannot update versions.json');
                console.log(e);
            }
        }
        console.log('Generated new docs version ' + newDocsVersion);

        return newBaseTree;
    } catch (e) {
        console.log('Warn: cannot create versioned docs');
        console.log(e);
    }
};

const uploadFiles = async (options) => {
    const defaultOptions = {
        directory: '',
        basePath: '',
        message: 'Update files',
    };
    const {
        directory,
        message,
        basePath,
    } = _.extend({}, defaultOptions, options);

    if (!fs.existsSync(directory)) {
        return;
    }

    const files = glob.sync(
        path.resolve(__dirname, '../api-docs/**/*'),
        {
            nodir: true,
        },
    );

    const newTree = await Promise.all(
        files.map((absolutePathname) => {
            return octokit.request('POST https://api.github.com/repos/{user}/{repo}/git/blobs', {
                user: GIT_USER,
                repo: GIT_REPO,
                content: fs.readFileSync(absolutePathname).toString(),
                encoding: 'utf-8',
            }).then((res) => {
                console.log('Uploaded: ' + absolutePathname);
                return res;
            });
        }),
    ).then((blobs) => {
        return blobs.map((blob, index) => {
            return {
                mode: '100644',
                type: 'blob',
                path: path.join(
                    basePath,
                    path.relative(
                        path.resolve(__dirname, '../api-docs'),
                        files[index],
                    ),
                ),
                sha: _.get(blob, 'data.sha'),
            };
        });
    });

    console.log('New api docs blob tree generated');

    const baseTreeInfo = await octokit.request('GET https://api.github.com/repos/{user}/{repo}/git/trees/{branch}?recursive=1', {
        user: GIT_USER,
        repo: GIT_REPO,
        branch: GIT_BRANCH,
    });

    const baseTreeSha = _.get(baseTreeInfo, 'data.sha');

    if (!baseTreeSha) {
        return;
    }

    console.log('Creating new tree');
    const createTreeResponse = await octokit.request('POST https://api.github.com/repos/{user}/{repo}/git/trees', {
        user: GIT_USER,
        repo: GIT_REPO,
        tree: ((await createVersionedDocs(_.get(baseTreeInfo, 'data.tree') || [])) || _.get(baseTreeInfo, 'data.tree') || []).filter((tree) => {
            return (
                tree.type !== 'tree' &&
                !newTree.some((newTreeItem) => newTreeItem.path === tree.path) &&
                !tree.path.startsWith(basePath)
            );
        }).concat(newTree),
        baseTree: baseTreeSha,
    });
    console.log('Created new tree');
    const newTreeSha = _.get(createTreeResponse, 'data.sha');
    const parentTreeResponse = await octokit.request('GET https://api.github.com/repos/{user}/{repo}/git/refs/heads/{branch}', {
        user: GIT_USER,
        repo: GIT_REPO,
        branch: GIT_BRANCH,
    });
    const parentSha = _.get(parentTreeResponse, 'data.object.sha');

    if (!parentSha) {
        return;
    }

    const commitResponse = await octokit.request('POST https://api.github.com/repos/{user}/{repo}/git/commits', {
        user: GIT_USER,
        repo: GIT_REPO,
        tree: newTreeSha,
        message,
        parents: [
            parentSha,
        ],
    });
    const commitSha = _.get(commitResponse, 'data.sha');

    await octokit.request('PATCH https://api.github.com/repos/{user}/{repo}/git/refs/heads/{branch}', {
        user: GIT_USER,
        repo: GIT_REPO,
        branch: GIT_BRANCH,
        sha: commitSha,
    });
};

const generateApiDocs = async () => {
    let rushConfig = {};
    let projects = [];
    const apiDocsDir = path.resolve(__dirname, '../api-docs');

    try {
        const rawRushConfig = fs.readFileSync(path.resolve(__dirname, '../rush.json')).toString();
        rushConfig = JSON.parse(rawRushConfig.replace(/\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g, (m, g) => g ? '' : m));
        projects = _.get(rushConfig, 'projects') || [];
    } catch (e) {
        console.log(e);
    }

    if (!fs.existsSync(apiDocsDir)) {
        fs.mkdirpSync(apiDocsDir);
    }

    for (const [index, projectConfig] of projects.entries()) {
        let {
            shouldPublish,
            projectFolder,
            packageName,
        } = projectConfig;

        const packageFolderName = projectFolder.split('/').pop();

        if (!shouldPublish) {
            continue;
        }

        try {
            const packageDir = path.resolve(__dirname, '..', projectFolder);

            if (!packageName) {
                packageName = fs.readJsonSync(path.resolve(packageDir, 'package.json')).name;
            }

            if (!packageName) {
                continue;
            }

            console.log(`Generating ${packageName}`);
            await new Promise((resolve, reject) => {
                const childProcess = spawn(
                    'node',
                    [
                        path.resolve(__dirname, '../node_modules/.bin/typedoc'),
                        '--readme',
                        'none',
                        '--out',
                        path.resolve(apiDocsDir, packageFolderName),
                        '--plugin',
                        'typedoc-plugin-markdown',
                        '--namedAnchors',
                        'true',
                        '--entryDocument',
                        'index.md',
                        '--githubPages',
                        'false',
                        './src',
                    ],
                    {
                        cwd: packageDir,
                    },
                );
                childProcess.on('exit', () => {
                    fs.writeFileSync(
                        path.resolve(apiDocsDir, packageFolderName, '_category_.json'),
                        JSON.stringify({
                            label: packageName,
                            position: index,
                        }, null, 4) + '\n',
                    );
                    resolve();
                });
            });
        } catch (e) {
            continue;
        }
    }

    fs.writeFileSync(
        path.resolve(apiDocsDir, '_category_.json'),
        JSON.stringify({
            label: 'API',
            link: {
                type: 'generated-index',
            },
        }, null, 4) + '\n',
    );

    console.log('Generate api docs successfully');
};

try {
    generateApiDocs().then(() => {
        console.log('Uploading built docs ...');
        uploadFiles({
            branch: 'master',
            directory: path.resolve(__dirname, '../api-docs'),
            basePath: 'docs/api',
            message: 'Update API docs',
        }).then(() => console.log('Docs updated successfully'));
    });
} catch (e) {
    console.log(e);
}
