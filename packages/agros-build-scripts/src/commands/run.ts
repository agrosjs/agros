import * as path from 'path';
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

    runCommand(
        'node',
        [
            path.resolve(
                __dirname,
                `../../node_modules/react-app-rewired/bin/${command === 'test' ? 'jest.js' : 'index.js'}`,
            ),
            command,
            ...(
                overridesFileExists()
                    ? []
                    : [
                        '--config-overrides',
                        path.resolve(__dirname, '../../config-overrides.js'),
                    ]
            ),
        ],
        {
            stdio: 'inherit',
        },
    );
};
