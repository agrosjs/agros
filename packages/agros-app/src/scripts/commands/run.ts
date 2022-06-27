import * as path from 'path';
import * as fs from 'fs';
import { runCommand } from '@agros/utils';
import { overridesFileExists } from '../utils';
import { Logger } from '@agros/logger';

export const run = (command) => {
    const logger = new Logger();

    if (!command) {
        logger.error('Command must be specified');
        process.exit(1);
    }

    if (
        [
            'build',
            'start',
            'test',
        ].indexOf(command) === -1
    ) {
        logger.error(`Command "${command}" does not match none of the supported commands`);
        process.exit(1);
    }

    let reactAppRewiredBinaryPath = path.resolve(
        path.dirname(require.resolve('react-app-rewired')),
        `bin/${command === 'test' ? 'jest.js' : 'index.js'}`,
    );

    if (!fs.existsSync(reactAppRewiredBinaryPath)) {
        reactAppRewiredBinaryPath = path.resolve(
            process.cwd(),
            `bin/${command === 'test' ? 'jest.js' : 'index.js'}`,
        );
    }

    if (!fs.existsSync(reactAppRewiredBinaryPath)) {
        logger.error('Fatal: lost engine files');
        process.exit(1);
    }

    runCommand(
        'node',
        [
            reactAppRewiredBinaryPath,
            command,
            ...(
                overridesFileExists()
                    ? []
                    : [
                        '--config-overrides',
                        path.resolve(__dirname, '../../../config-overrides.js'),
                    ]
            ),
        ],
        {
            stdio: 'inherit',
        },
    );
};
