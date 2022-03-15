const path = require('path');
const child_process = require('child_process');

const cwd = path.resolve(process.cwd(), 'examples');
const reactRewiredPath = path.resolve(process.cwd(), './node_modules/.bin/react-app-rewired');

child_process.execFileSync(reactRewiredPath, ['start'], {
    cwd,
    stdio: 'inherit',
});
