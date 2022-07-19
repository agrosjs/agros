import { Command } from 'commander';
import { AbstractCommand } from '../command.abstract';
import { addArgumentsAndOptionsToCommandWithSchema } from '../utils';
import * as path from 'path';
import { normalizeSrcPath } from '@agros/common';

export class GenerateCommand extends AbstractCommand implements AbstractCommand {
    public register(): Command {
        const command = new Command('generate');
        command.alias('g').description('Generate Agros.js collections');

        for (const collection of this.collections) {
            const {
                name,
                schema = {},
                FactoryClass,
            } = collection;
            const collectionCommand = new Command(name);
            const parseProps = addArgumentsAndOptionsToCommandWithSchema(
                collectionCommand,
                schema,
                'properties',
                'required',
            );

            collectionCommand.action(async (...data) => {
                try {
                    const props = parseProps(data);
                    const factory = new FactoryClass();
                    const result = await factory.generate(props);

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
