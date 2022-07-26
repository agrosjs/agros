import { Command } from 'commander';
import commands from './commands';
import { readJsonSync } from 'fs-extra';
import * as path from 'path';

const run = async () => {
    const program = new Command('agros');

    try {
        program.version(readJsonSync(path.resolve(__dirname, '../package.json'))?.version || 'unknown');
    } catch (e) {}

    for (const CommandClass of commands) {
        const subCommand = new CommandClass();
        if (typeof subCommand.register === 'function') {
            program.addCommand(subCommand.register.call(subCommand));
        }
    }

    program.parse(process.argv);
};

export default run;
