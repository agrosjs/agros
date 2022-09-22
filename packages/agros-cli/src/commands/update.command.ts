import { Command } from 'commander';
import { AbstractCommand } from '../command.abstract';
import {
    addArgumentsAndOptionsToCommandWithSchema,
    loadCollections,
    logGenerateResult,
} from '../utils';
import { AbstractUpdaterFactory } from '@agros/tools/lib/collection';

export class UpdateCommand extends AbstractCommand implements AbstractCommand {
    public register() {
        const collections = loadCollections<AbstractUpdaterFactory>('update');
        const command = new Command('update');
        command.alias('u').description('Update an Agros.js collections with another collection');

        ['add', 'delete'].forEach((type) => {
            const factoryMethod = type as 'add' | 'delete';
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
                    command: collectionCommand,
                    schema,
                    prependProperties: {
                        target: {
                            type: 'input',
                            message: 'Target entity pathname or identifier',
                            cliType: 'argument',
                        },
                        use: {
                            type: 'input',
                            message: 'Source entity pathname or identifier',
                            cliType: 'option',
                        },
                    },
                    defaultRequired: ['use', 'target'],
                });

                collectionCommand.action(async (...data) => {
                    try {
                        const {
                            use: source,
                            ...otherProps
                        } = parseProps(data);
                        const factory = new FactoryClass();
                        if (typeof factory[factoryMethod] === 'function') {
                            const result = await factory[factoryMethod]({
                                source,
                                ...otherProps,
                            });
                            logGenerateResult(result);
                        }
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
