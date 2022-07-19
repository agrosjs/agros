import { Command } from 'commander';
import { AbstractCommand } from '../command.abstract';

interface UpdateCommandOptions {
    skipModuleExport: boolean;
}

export class UpdateCommand extends AbstractCommand implements AbstractCommand {
    public register() {
        const command = new Command('update');
        command.alias('u').description('Update Agros.js collection with several types of collections');

        command
            .argument('<from>', 'Path or selector of source entity, e.g. foo.service')
            .argument('<to>', 'Path or selector of target entity, e.g. foo.module')
            .option('--skip-module-export', 'Prevent exporting source entity from target module', false)
            .action(async (from: string, to: string, {
                skipModuleExport,
            }: UpdateCommandOptions) => {
            });

        return command;
    }
}
