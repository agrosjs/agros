import { Command } from 'commander';
import commands from './commands';

const run = async () => {
    const program = new Command();

    for (const CommandClass of commands) {
        const subCommand = new CommandClass();
        if (typeof subCommand.register === 'function') {
            program.addCommand(subCommand.register());
        }
    }

    program.parse(process.argv);
};

export default run;
