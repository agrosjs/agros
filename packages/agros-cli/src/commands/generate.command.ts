import { Command } from 'commander';
import { AbstractCommand } from '../command.abstract';
import {
    addArgumentsAndOptionsToCommandWithSchema,
    loadCollections,
    logGenerateResult,
} from '../utils';
import { AbstractGeneratorFactory } from '@agros/tools/lib/collection';

export class GenerateCommand extends AbstractCommand implements AbstractCommand {
    public register(): Command {
        const collections = loadCollections<AbstractGeneratorFactory>('generate');
        const command = new Command('generate');
        command.alias('g').description('Generate Agros.js collections');

        for (const collection of collections) {
            const {
                name,
                schema = {},
                FactoryClass,
            } = collection;
            const collectionCommand = new Command(name);
            const parseProps = addArgumentsAndOptionsToCommandWithSchema({
                scene: 'generate',
                command: collectionCommand,
                schema,
            });

            collectionCommand.action(async (...data) => {
                try {
                    const props = parseProps(data);
                    const factory = new FactoryClass();
                    const result = await factory.generate(props);
                    logGenerateResult(result);
                } catch (e) {
                    this.logger.error(e.message || e.toString());
                    process.exit(1);
                }
            });

            command.addCommand(collectionCommand);
        }

        return command;
    }
}
