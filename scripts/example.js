const path = require('path');
const child_process = require('child_process');

const cwd = path.resolve(process.cwd(), 'examples');
const reactScriptsPath = path.resolve(process.cwd(), './node_modules/.bin/react-scripts');

child_process.execFileSync(reactScriptsPath, ['start'], {
    cwd,
    stdio: 'inherit',
});
