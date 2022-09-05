const path = require('path');
const fs = require('fs-extra');
const _ = require('lodash');
const { spawn } = require('child_process');
const glob = require('glob');
const Octokat = require('octokat');

function init(userOptions) {
    const defaults = {
        branchName: 'master',
        token: '',
        username: '',
        reponame: '',
    };
    const options = _.extend({}, defaults, userOptions);
    let head;
    let octo = new Octokat({
        token: options.token,
    });
    let repo = octo.repos(options.username, options.reponame);

    function fetchHead() {
        return repo.git.refs.heads(options.branchName).fetch();
    }

    function fetchTree() {
        return fetchHead().then((commit) => {
            head = commit;
            return repo.git.trees(commit.object.sha).fetch();
        });
    }

    function commit(files, message) {
        return Promise.all(files.map((file) => {
            return repo.git.blobs.create({
                content: file.content,
                encoding: 'utf-8',
            });
        })).then((blobs) => {
            return fetchTree().then((tree) => {
                return repo.git.trees.create({
                    tree: files.map((file, index) => {
                        return {
                            path: file.path,
                            mode: '100644',
                            type: 'blob',
                            sha: blobs[index].sha,
                        };
                    }),
                    basetree: tree.sha,
                });
            });
        }).then((tree) => {
            return repo.git.commits.create({
                message: message,
                tree: tree.sha,
                parents: [
                    head.object.sha,
                ],
            });
        }).then((commit) => {
            return repo.git.refs.heads(options.branchName).update({
                sha: commit.sha,
            });
        });

    }

    return {
        commit: commit,
    };
}

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
                        }, null, 4),
                    );
                    resolve();
                });
                childProcess.stdout.on('data', (data) => console.log(data.toString()));
                childProcess.stderr.on('data', (error) => reject(error));
            });
        } catch (e) {
            continue;
        }
    }

    fs.writeFileSync(
        path.resolve(apiDocsDir, '_category_.json'),
        JSON.stringify({
            label: 'API',
        }, null, 4),
    );

    console.log('Generate api docs done');
};

try {
    const version = fs.readJsonSync(path.resolve(__dirname, '../packages/agros-app/package.json')).version;
    const [majorVersion] = version.split('.');
    const ghApi = init({
        username: 'agrosjs',
        token: process.env.GH_PERSONAL_TOKEN,
        reponame: 'agrosjs.github.io',
        branchName: 'gh-pages',
    });
    const docVersion = `${majorVersion}.x`;
    generateApiDocs(docVersion).then(() => {
        console.log('Uploading built docs ...');
        ghApi.commit(
            glob
                .sync(path.resolve(__dirname, '../api-docs/**/*'), { nodir: true })
                .map((absolutePathname) => {
                    const relativePathname = path.relative(path.resolve(__dirname, '../api-docs'), absolutePathname);
                    const entityPathname = path.join(`versioned_docs/version-${docVersion}/api`, relativePathname);
                    return {
                        path: entityPathname,
                        content: fs.readFileSync(absolutePathname).toString(),
                    };
                }),
            'Update API docs',
        ).then(() => console.log('Docs updated successfully'));
    });
} catch (e) {
    console.log(e);
}
