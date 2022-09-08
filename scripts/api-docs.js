const path = require('path');
const fs = require('fs-extra');
const _ = require('lodash');
const { spawn } = require('child_process');
const glob = require('glob');
const { Octokit } = require('octokit');

const uploadFiles = async (options) => {
    const defaultOptions = {
        branch: 'master',
        token: '',
        username: '',
        repo: '',
        directory: '',
        basePath: '',
        message: 'Update files',
    };
    const {
        branch: branchName,
        token,
        username,
        repo: repoName,
        directory,
        message,
        basePath,
    } = _.extend({}, defaultOptions, options);

    if (!fs.existsSync(directory)) {
        return;
    }

    const octokit = new Octokit({
        auth: token,
    });
    const files = glob.sync(
        path.resolve(__dirname, '../api-docs/**/*'),
        {
            nodir: true,
        },
    );

    const newTree = await Promise.all(
        files.map((absolutePathname) => {
            return octokit.request('POST https://api.github.com/repos/{user}/{repo}/git/blobs', {
                user: username,
                repo: repoName,
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

    const baseTreeInfo = await octokit.request('GET https://api.github.com/repos/{user}/{repo}/git/trees/{branch}?recursive=1', {
        user: username,
        repo: repoName,
        branch: branchName,
    });

    const baseTreeSha = _.get(baseTreeInfo, 'data.sha');

    if (!baseTreeSha) {
        return;
    }

    const createTreeResponse = await octokit.request('POST https://api.github.com/repos/{user}/{repo}/git/trees', {
        user: username,
        repo: repoName,
        tree: (_.get(baseTreeInfo, 'data.tree') || []).filter((tree) => {
            return (
                !newTree.some((newTreeItem) => newTreeItem.path === tree.path) &&
                tree.type !== 'tree' &&
                !tree.path.startsWith(basePath)
            );
        }).concat(newTree),
        baseTree: baseTreeSha,
    });
    const newTreeSha = _.get(createTreeResponse, 'data.sha');
    const parentTreeResponse = await octokit.request('GET https://api.github.com/repos/{user}/{repo}/git/refs/heads/{branch}', {
        user: username,
        repo: repoName,
        branch: branchName,
    });
    const parentSha = _.get(parentTreeResponse, 'data.object.sha');

    if (!parentSha) {
        return;
    }

    const commitResponse = await octokit.request('POST https://api.github.com/repos/{user}/{repo}/git/commits', {
        user: username,
        repo: repoName,
        tree: newTreeSha,
        message,
        parents: [
            parentSha,
        ],
    });
    const commitSha = _.get(commitResponse, 'data.sha');

    await octokit.request('PATCH https://api.github.com/repos/{user}/{repo}/git/refs/heads/{branch}', {
        user: username,
        repo: repoName,
        branch: branchName,
        sha: commitSha,
    });
};

const generateApiDocs = async (currentVersion) => {
    if (!_.isString(currentVersion)) {
        return;
    }

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
    const version = fs.readJsonSync(path.resolve(__dirname, '../packages/agros-app/package.json')).version;
    const [majorVersion] = version.split('.');
    const docVersion = `${majorVersion}.x`;
    generateApiDocs(docVersion).then(() => {
        console.log('Uploading built docs ...');
        uploadFiles({
            username: 'agrosjs',
            token: process.env.GITHUB_ACCESS_TOKEN,
            repo: 'agrosjs.github.io',
            branch: 'master',
            directory: path.resolve(__dirname, '../api-docs'),
            basePath: `versioned_docs/version-${docVersion}/api`,
            message: 'Update API docs',
        }).then(() => console.log('Docs updated successfully'));
    });
} catch (e) {
    console.log(e);
}
