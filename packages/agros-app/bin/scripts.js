#!/usr/bin/env node
const { Logger } = require('@agros/tools/lib/logger');
const { scanProjectEntities } = require('@agros/tools/lib/scanner');
const { checkEntities } = require('@agros/tools/lib/check-entities');
const { textSync } = require('figlet');

const scripts = {
    start: require('../lib/scripts/start').default,
    build: require('../lib/scripts/build').default,
};
const logger = new Logger();
const type = process.argv[2];

if (!type) {
    logger.error('Parameter \'type\' must be specified');
    process.exit(1);
}

const runScript = scripts[type];

if (typeof runScript !== 'function') {
    logger.error(`Cannot load command '${type}'`);
    process.exit(2);
}

try {
    checkEntities(scanProjectEntities());
} catch (e) {
    logger.error(e.message);
}

console.log(textSync('agros'));
runScript();
