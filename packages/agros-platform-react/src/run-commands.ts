import { runCommand } from '@agros/utils/lib/run-command';
import * as fs from 'fs';
import * as path from 'path';
import { overridesFileExists } from './override-file-exists';

export const runCommands = (command: string) => {
    if (
        [
            'build',
            'start',
            'test',
        ].indexOf(command) === -1
    ) {
        throw new Error(`Command "${command}" does not match none of the supported commands`);
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
        throw new Error('Fatal: lost engine files');
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
                        path.resolve(__dirname, '../config-overrides.js'),
                    ]
            ),
        ],
        {
            stdio: 'inherit',
            env: {
                ...process.env,
                BROWSER: 'none',
            },
        },
    );
};
