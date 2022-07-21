import { Command } from 'commander';
import { AbstractCommand } from '../command.abstract';
import {
    addArgumentsAndOptionsToCommandWithSchema,
    getCollections,
    logGenerateResult,
} from '../utils';

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
                    logGenerateResult(result);
                } catch (e) {
                    this.logger.error('error', e.message || e.toString());
                    process.exit(1);
                }
            });

            command.addCommand(collectionCommand);
        }

        return command;
    }
}
