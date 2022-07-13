import { Command } from 'commander';
import { AbstractCommand } from '../command.abstract';

export class GenerateCommand extends AbstractCommand implements AbstractCommand {
    public register(): Command {
        const command = new Command('generate');
        command
            .alias('g');

        return command;
    }
}
