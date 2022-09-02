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

interface InterceptorCollectionGenerateOptions {
    name: string;
    moduleName?: string;
    skipExport?: boolean;
}

export class InterceptorCollectionGenerateFactory extends AbstractCollection implements AbstractCollection {
    public async generate({
        name,
        moduleName,
        skipExport,
    }: InterceptorCollectionGenerateOptions) {
        if (!name) {
            throw new Error('Expect `name` to be of type `string`');
        }

        const result: CollectionGenerateResult = {
            create: [],
            update: [],
        };
        const injectableEntityName = _.kebabCase(name);
        const entityModuleName = moduleName ? _.kebabCase(moduleName) : injectableEntityName;
        const filename = normalizeEntityFileName('interceptor', injectableEntityName, '*.interceptor.ts');
        const targetPath = this.modulesPath(`${entityModuleName}/${filename}`);

        await this.writeTemplateFile(
            path.resolve(__dirname, 'files/interceptor.ts._'),
            targetPath,
            {
                name: _.startCase(injectableEntityName.toLowerCase()).replace(/\s+/g, ''),
            },
        );

        result.create.push(targetPath);
        this.updateEntities();

        const moduleEntityDescriptor = this.entities.find((entity) => {
            return entity.collectionType === 'module' && entity.moduleName === entityModuleName;
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

interface InterceptorCollectionUpdateOptions extends UpdateBaseOptions {
    accessibility?: 'private' | 'protected' | 'public';
    skipReadonly?: boolean;
}

export class InterceptorCollectionUpdateFactory extends AbstractCollection implements AbstractCollection {
    public async generate({
        source,
        target,
        accessibility,
        skipReadonly,
    }: InterceptorCollectionUpdateOptions) {
        const result: CollectionGenerateResult = {
            create: [],
            update: [],
        };

        const sourceDescriptor = normalizeCLIPath(source, this.entities);
        const targetDescriptor = normalizeCLIPath(target, this.entities, 'interceptor');

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
