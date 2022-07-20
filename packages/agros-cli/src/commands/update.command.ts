import { normalizeSrcPath } from '@agros/common';
import { Command } from 'commander';
import { AbstractCommand } from '../command.abstract';
import {
    addArgumentsAndOptionsToCommandWithSchema,
    getCollections,
} from '../utils';
import * as path from 'path';

export class UpdateCommand extends AbstractCommand implements AbstractCommand {
    public register() {
        const collections = getCollections('update');
        const command = new Command('update');
        command.alias('u').description('Update an Agros.js collections with another collection');

        for (const collection of collections) {
            const {
                name,
                schema = {},
                FactoryClass,
            } = collection;
            const collectionCommand = new Command(name);
            const parseProps = addArgumentsAndOptionsToCommandWithSchema({
                scene: 'update',
                command: collectionCommand,
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

                    for (const resultKey of Object.keys(result)) {
                        const files = result[resultKey];

                        if (!Array.isArray(files)) {
                            continue;
                        }

                        for (const filepath of files) {
                            process.stdout.write(resultKey.toUpperCase() + ': ' + path.relative(normalizeSrcPath(), filepath) + '\n');
                        }
                    }
                } catch (e) {
                    process.stdout.write('\x1b[31m' + (e.message || e.toString()) + '\x1b[0m\n');
                    process.stdout.write('\n');
                    process.exit(1);
                }
            });

            command.addCommand(collectionCommand);
        }

        return command;
    }
}
