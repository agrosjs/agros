import { Command } from 'commander';
import { AbstractCommand } from '../command.abstract';
import {
    addArgumentsAndOptionsToCommandWithSchema,
    loadCollections,
    logGenerateResult,
} from '../utils';
import { AbstractGeneratorFactory } from '@agros/tools/lib/collection';

export class UpdateCommand extends AbstractCommand implements AbstractCommand {
    public register() {
        const collections = loadCollections<AbstractGeneratorFactory>('update');
        const command = new Command('update');
        command.alias('u').description('Update an Agros.js collections with another collection');

        ['add', 'delete'].forEach((type) => {
            const subCommand = new Command(type);
            for (const collection of collections) {
                const {
                    name,
                    schema = {},
                    FactoryClass,
                } = collection;
                const collectionCommand = new Command(name);
                const parseProps = addArgumentsAndOptionsToCommandWithSchema({
                    scene: `update.${type}`,
                    command: subCommand,
                    schema,
                    prependProperties: {
                        target: {
                            type: 'input',
                            message: 'Target entity pathname or identifier',
                            cliType: 'argument',
                        },
                        from: {
                            type: 'input',
                            message: 'Source entity pathname or identifier',
                            cliType: 'option',
                        },
                    },
                    defaultRequired: ['from', 'target'],
                });

                collectionCommand.action(async (...data) => {
                    try {
                        const {
                            from: source,
                            ...otherProps
                        } = parseProps(data);
                        const factory = new FactoryClass();
                        const result = await factory.generate({
                            source,
                            ...otherProps,
                        });
                        logGenerateResult(result);
                    } catch (e) {
                        this.logger.error(e.message || e.toString());
                        process.exit(1);
                    }
                });

                subCommand.addCommand(collectionCommand);
            }
            command.addCommand(subCommand);
        });

        return command;
    }
}
