#!/usr/bin/env node
const { Logger } = require('@agros/logger');

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

runScript();
