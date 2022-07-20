import {
    applyUpdates,
    normalizeCLIPath,
    normalizeSrcPath,
    scanProjectEntities,
    updateImportedEntityToComponent,
    updateImportedEntityToModule,
    updateImportedServiceToService,
    UpdaterWithChecker,
} from '@agros/common';
import { Command } from 'commander';
import _ from 'lodash';
import { AbstractCommand } from '../command.abstract';
import { addArgumentsAndOptionsToCommandWithSchema } from '../utils';
import * as fs from 'fs-extra';
import * as path from 'path';

export class UpdateCommand extends AbstractCommand implements AbstractCommand {
    public register() {
        const command = new Command('update');
        command.alias('u').description('Update Agros.js collection with several types of collections');

        for (const collection of this.collections) {
            const {
                name,
                schema = {},
            } = collection;
            const collectionCommand = new Command(name);
            const parseProps = addArgumentsAndOptionsToCommandWithSchema({
                command: collectionCommand,
                schema,
                propertiesKey: 'updateProperties',
                requiredPropertiesKey: 'updateRequired',
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
                        target,
                        ...updaterOptions
                    } = parseProps(data);

                    const entities = scanProjectEntities();
                    const sourceDescriptor = normalizeCLIPath(source, entities);
                    const targetDescriptor = normalizeCLIPath(target, entities, name.toLowerCase());

                    if (!sourceDescriptor) {
                        throw new Error(`Cannot find source entity with identifier: ${source}`);
                    }

                    if (!targetDescriptor) {
                        throw new Error(`Cannot find target entity with identifier: ${target}`);
                    }

                    let updater: UpdaterWithChecker;

                    switch (name.toLowerCase()) {
                        case 'module': {
                            updater = updateImportedEntityToModule;
                            break;
                        }
                        case 'component': {
                            updater = updateImportedEntityToComponent;
                            break;
                        }
                        case 'service': {
                            updater = updateImportedServiceToService;
                            break;
                        }
                        default:
                            break;
                    }

                    if (!_.isFunction(updater)) {
                        throw new Error(`Cannot find updater from type '${targetDescriptor.collectionType}' to type 'module'`);
                    }

                    const updates = await updater(sourceDescriptor, targetDescriptor, updaterOptions);

                    if (updates.length === 0) {
                        return;
                    }

                    fs.writeFileSync(
                        targetDescriptor.absolutePath,
                        applyUpdates(updates, fs.readFileSync(targetDescriptor.absolutePath).toString()),
                    );

                    process.stdout.write('UPDATE: ' + path.relative(normalizeSrcPath(), targetDescriptor.absolutePath) + '\n');
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
