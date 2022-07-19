import {
    updateImportedEntityToComponent,
    updateImportedEntityToModule,
    updateImportedServiceToService,
    UpdaterWithChecker,
} from '@agros/common';
import { Command } from 'commander';
import { AbstractCommand } from '../command.abstract';
import { addArgumentsAndOptionsToCommandWithSchema } from '../utils';

interface UpdaterMap {
    [from: string]: {
        [to: string]: UpdaterWithChecker;
    }
}

export class UpdateCommand extends AbstractCommand implements AbstractCommand {
    private updater: UpdaterMap = {
        component: {
            module: updateImportedEntityToModule,
            component: updateImportedEntityToComponent,
        },
        service: {
            module: updateImportedEntityToModule,
            component: updateImportedEntityToComponent,
            service: updateImportedServiceToService,
        },
        module: {
            module: updateImportedEntityToModule,
        },
    };

    public register() {
        const command = new Command('update');
        command.alias('u').description('Update Agros.js collection with several types of collections');

        for (const collection of this.collections) {
            const {
                name,
                schema = {},
            } = collection;
            const collectionCommand = new Command(name);
            const parseProps = addArgumentsAndOptionsToCommandWithSchema(
                collectionCommand,
                schema,
                'properties',
                'required',
            );

            collectionCommand.action(async (...data) => {
                // TODO
                // eslint-disable-next-line no-unused-vars
                const props = parseProps(data);
            });

            command.addCommand(collectionCommand);
        }

        return command;
    }
}
