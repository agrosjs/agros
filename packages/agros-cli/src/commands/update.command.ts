import { Command } from 'commander';
import { AbstractCommand } from '../command.abstract';
import {
    addArgumentsAndOptionsToCommandWithSchema,
    loadCollections,
    logGenerateResult,
} from '../utils';
import { AbstractUpdaterFactory, CollectionFactoryResult } from '@agros/tools/lib/collection';

export class UpdateCommand extends AbstractCommand implements AbstractCommand {
    protected readonly updateTypes = [
        'add',
        'delete',
    ];

    public register() {
        const collections = loadCollections<AbstractUpdaterFactory>('update');
        const command = new Command('update');
        command.alias('u').description('Update an Agros.js collections with another collection');

        for (const collection of collections) {
            const {
                name,
                schema = {},
                FactoryClass,
            } = collection;
            const collectionCommand = new Command(name);
            const factory = new FactoryClass();
            const types = this.updateTypes.filter((updateType) => typeof factory[updateType] === 'function');

            if (types.length === 0) {
                continue;
            }

            const parseProps = addArgumentsAndOptionsToCommandWithSchema({
                scene: `update.${name}`,
                command: collectionCommand,
                schema,
                prependProperties: {
                    target: {
                        type: 'input',
                        message: 'Target entity pathname or identifier',
                        cliType: 'argument',
                    },
                    with: {
                        type: 'input',
                        message: 'Source entity pathname or identifier',
                        cliType: 'option',
                    },
                    type: {
                        type: 'input',
                        message: 'Collection update type',
                        cliType: 'option',
                        default: types,
                    },
                },
                defaultRequired: ['with', 'target', 'type'],
            });

            collectionCommand.action(async (...data) => {
                try {
                    const {
                        with: source,
                        type,
                        ...otherProps
                    } = parseProps(data);
                    let result: CollectionFactoryResult = {
                        update: [],
                        create: [],
                    };
                    if (typeof factory[type] === 'function') {
                        result = await factory[type]({
                            source,
                            ...otherProps,
                        });
                    }
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
