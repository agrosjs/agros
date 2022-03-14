/**
 * Scripts to check unpublished version and run publish
 */
const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;

function publish(directory) {
    console.log('[PUBLISH] npmrc file exists', fs.existsSync(path.resolve(directory, '.npmrc')));

    execSync('npm publish --access public', {
        cwd: directory,
        encoding: 'utf-8',
        stdio: 'inherit',
    });
}

const NPM_TOKEN = process.env.NPM_TOKEN;
const BASE_PATH = process.cwd();

if (!NPM_TOKEN) {
    console.log('No npm token found');
    process.exit(1);
}

fs.writeFileSync(path.join(BASE_PATH, '.npmrc'), `//registry.npmjs.org/:_authToken=${NPM_TOKEN}`);
publish(BASE_PATH);
