import {
    AbstractCollection,
    applyUpdates,
    CollectionGenerateResult,
    normalizeCLIPath,
    normalizeEntityFileName,
    UpdateBaseOptions,
    updateImportedEntityToModule,
    updateImportedInjectableToInjectable,
} from '@agros/common';
import * as path from 'path';
import _ from 'lodash';
import * as fs from 'fs';

interface ServiceCollectionGenerateOptions {
    name: string;
    moduleName?: string;
    skipExport?: boolean;
}

export class ServiceCollectionGenerateFactory extends AbstractCollection implements AbstractCollection {
    public async generate({
        name,
        moduleName,
        skipExport,
    }: ServiceCollectionGenerateOptions) {
        if (!name) {
            throw new Error('Expect `name` to be of type `string`');
        }

        const result: CollectionGenerateResult = {
            create: [],
            update: [],
        };
        const serviceName = _.kebabCase(name);
        const serviceModuleName = moduleName ? _.kebabCase(moduleName) : serviceName;
        const filename = normalizeEntityFileName('service', serviceName, '*.service.ts');
        const targetPath = this.modulesPath(`${serviceModuleName}/${filename}`);

        await this.writeTemplateFile(
            path.resolve(__dirname, 'files/service.ts._'),
            targetPath,
            {
                name: _.startCase(serviceName.toLowerCase()).replace(/\s+/g, ''),
            },
        );

        result.create.push(targetPath);
        this.updateEntities();

        const moduleEntityDescriptor = this.entities.find((entity) => {
            return entity.collectionType === 'module' && entity.moduleName === serviceModuleName;
        });

        if (moduleEntityDescriptor) {
            const updates = await updateImportedEntityToModule(
                this.getEntityDescriptor(targetPath),
                moduleEntityDescriptor,
                {
                    skipExport,
                },
            );
            await this.writeFile(
                moduleEntityDescriptor.absolutePath,
                applyUpdates(updates, fs.readFileSync(moduleEntityDescriptor.absolutePath).toString()),
            );
            result.update.push(moduleEntityDescriptor.absolutePath);
        }

        return result;
    }
}

interface ServiceCollectionUpdateOptions extends UpdateBaseOptions {
    accessibility?: 'private' | 'protected' | 'public';
    skipReadonly?: boolean;
}

export class ServiceCollectionUpdateFactory extends AbstractCollection implements AbstractCollection {
    public async generate({
        source,
        target,
        accessibility,
        skipReadonly,
    }: ServiceCollectionUpdateOptions) {
        const result: CollectionGenerateResult = {
            create: [],
            update: [],
        };

        const sourceDescriptor = normalizeCLIPath(source, this.entities);
        const targetDescriptor = normalizeCLIPath(target, this.entities, 'service');

        if (!sourceDescriptor) {
            throw new Error(`Cannot find source entity with identifier: ${source}`);
        }

        if (!targetDescriptor) {
            throw new Error(`Cannot find target entity with identifier: ${target}`);
        }

        const updates = await updateImportedInjectableToInjectable(sourceDescriptor, targetDescriptor, {
            skipReadonly,
            accessibility,
        });

        if (updates.length > 0) {
            this.writeFile(
                targetDescriptor.absolutePath,
                applyUpdates(updates, fs.readFileSync(targetDescriptor.absolutePath).toString()),
            );
            result.update.push(targetDescriptor.absolutePath);
        }

        return result;
    }
}
