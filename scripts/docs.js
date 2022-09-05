const path = require('path');
const fs = require('fs-extra');
const _ = require('lodash');
const { execFileSync } = require('child_process');

const generateApiDocs = (currentVersion) => {
    if (!_.isNumber(currentVersion)) {
        return;
    }

    let rushConfig = {};
    let projects = [];
    const docsDir = path.resolve(__dirname, '../docs');
    const apiDir = path.resolve(__dirname, `../docs/api-${currentVersion}`);

    try {
        rushConfig = fs.readJsonSync(path.resolve(__dirname, '../rush.json'));
        projects = _.get(rushConfig, 'projects') || [];
    } catch (e) {}

    if (!fs.existsSync(docsDir)) {
        fs.mkdirpSync(docsDir);
    }

    Promise.all(
        projects.map((projectConfig) => {
            let {
                shouldPublish,
                projectFolder,
                packageName,
            } = projectConfig;

            if (!shouldPublish) {
                return null;
            }

            try {
                const packageDir = path.resolve(__dirname, '..', projectFolder);

                if (!packageName) {
                    packageName = fs.readJsonSync(path.resolve(packageDir, 'package.json')).name;
                }

                if (!packageName) {
                    return null;
                }

                fs.removeSync(path.resolve(docsDir, 'api'));
                fs.removeSync(path.resolve(docsDir, 'api-' + currentVersion));

                return new Promise((resolve, reject) => {
                    try {
                        console.log(`Generating ${packageName}`);
                        const result = execFileSync(
                            path.resolve(__dirname, '../node_modules/.bin/typedoc'),
                            [
                                '--readme',
                                'none',
                                '--out',
                                path.resolve(apiDir, packageName),
                            ],
                            {
                                cwd: packageDir,
                            },
                        );
                        resolve(result);
                    } catch (e) {
                        reject(e);
                    }
                });
            } catch (e) {
                return null;
            }
        }).filter(Boolean),
    ).then(() => {
        fs.copySync(apiDir, path.resolve(__dirname, '../docs/api'));
        console.log('Generate api docs done');
    }).catch((e) => {
        console.error(e);
    });
};

try {
    const version = fs.readJsonSync(path.resolve(__dirname, '../packages/agros-app/package.json')).version;
    generateApiDocs(version);
} catch (e) {}
