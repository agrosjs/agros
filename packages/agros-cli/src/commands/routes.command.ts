import {
    applyUpdates,
    CollectionGenerateResult,
    normalizeCLIPath,
    scanProjectEntities,
    updateImportedEntityToModule,
    updateRouteToModule,
} from '@agros/common';
import { CollectionType } from '@agros/config';
import {
    Command,
    Option,
} from 'commander';
import { AbstractCommand } from '../command.abstract';
import * as fs from 'fs-extra';
import { logGenerateResult } from '../utils';

export class RoutesCommand extends AbstractCommand implements AbstractCommand {
    public register() {
        const command = new Command('routes');
        command
            .alias('r')
            .description('Manage project routes');

        const addCommand = new Command('add')
            .alias('a')
            .description('Add a route with a module class or a component class')
            .argument('<target>', 'Target module\'s pathname or identifier')
            .option('--export', 'Export source class from target module', false)
            .addOption(
                new Option('-p, --path [pathname]', 'The pathname to the route')
                    .makeOptionMandatory(true)
                    .preset(''),
            )
            .addOption(
                new Option('-C, --use-component [identifier]', 'Source component\'s pathname or identifier')
                    .preset('')
                    .conflicts(['useModule']),
            )
            .addOption(
                new Option('-M, --use-module [identifier]', 'Source module\'s pathname or identifier')
                    .preset('')
                    .conflicts(['useComponent']),
            )
            .action(async (target, options = {}) => {
                try {
                    const entities = scanProjectEntities();
                    const {
                        path: pathname,
                        useComponent,
                        useModule,
                        export: exportFromModule = false,
                    } = options;
                    const result: CollectionGenerateResult = {
                        create: [],
                        update: [],
                    };

                    let source = useComponent || useModule;
                    let sourceCollectionType: CollectionType;

                    if (useComponent) {
                        sourceCollectionType = 'component';
                    } else {
                        sourceCollectionType = 'module';
                    }

                    if (!source) {
                        throw new Error('One of \'--use-component\' or \'--use-component\' must be specified');
                    }

                    const sourceDescriptor = normalizeCLIPath(source, entities, sourceCollectionType);
                    const targetDescriptor = normalizeCLIPath(target, entities, 'module');

                    if (!sourceDescriptor) {
                        throw new Error('Cannot find source ' + sourceCollectionType + ' with identifier or path: \'' + source + '\'');
                    }

                    if (!targetDescriptor) {
                        throw new Error('Cannot find target module with identifier or path: \'' + target + '\'');
                    }

                    const importEntityUpdates = await updateImportedEntityToModule(sourceDescriptor, targetDescriptor, {
                        skipExport: !exportFromModule,
                    });

                    if (Array.isArray(importEntityUpdates) && importEntityUpdates.length > 0) {
                        fs.writeFileSync(
                            targetDescriptor.absolutePath,
                            applyUpdates(
                                importEntityUpdates,
                                fs.readFileSync(targetDescriptor.absolutePath).toString(),
                            ),
                            {
                                encoding: 'utf-8',
                            },
                        );
                    }

                    const updates = await updateRouteToModule(sourceDescriptor, targetDescriptor, {
                        path: pathname,
                    });

                    if (Array.isArray(updates) && updates.length > 0) {
                        fs.writeFileSync(
                            targetDescriptor.absolutePath,
                            applyUpdates(updates, fs.readFileSync(targetDescriptor.absolutePath).toString()),
                            {
                                encoding: 'utf-8',
                            },
                        );
                        result.update.push(targetDescriptor.absolutePath);
                    }

                    logGenerateResult(result);
                } catch (e) {
                    this.logger.error(e.message || e.toString());
                    process.exit(1);
                }
            });

        command.addCommand(addCommand);

        return command;
    }
}
