import {
    AbstractCollection,
    applyUpdates,
    CollectionGenerateResult,
    detectRootPoint,
    getEntityDescriptorWithAlias,
    normalizeCLIPath,
    normalizeEntityFileName,
    UpdateBaseOptions,
    updateImportedEntityToModule,
} from '@agros/common';
import * as path from 'path';
import _ from 'lodash';
import * as fs from 'fs';

interface ModuleCollectionGenerateOptions {
    name: string;
    async?: boolean;
    global?: boolean;
    skipDeclareCollections?: boolean;
    skipExportDeclaredCollections?: boolean;
}

export class ModuleCollectionGenerateFactory extends AbstractCollection implements AbstractCollection {
    public async generate({
        name,
        async: asyncModule,
        global: globalModule = false,
        skipDeclareCollections,
        skipExportDeclaredCollections,
    }: ModuleCollectionGenerateOptions) {
        if (!name) {
            throw new Error('Expect `name` to be of type `string`');
        }

        const result: CollectionGenerateResult = {
            create: [],
            update: [],
        };
        const moduleName = _.kebabCase(name);
        const filename = normalizeEntityFileName('module', moduleName, '*.module.ts');

        const targetPath = this.modulesPath(`${moduleName}/${filename}`);

        await this.writeTemplateFile(
            path.resolve(__dirname, 'files/module.ts._'),
            targetPath,
            {
                globalModule,
                name: _.startCase(moduleName.toLowerCase()).replace(/\s+/g, ''),
            },
        );

        result.create.push(targetPath);

        if (skipDeclareCollections) {
            return result;
        }

        this.updateEntities();

        const collectionDescriptors = this.entities.filter((entity) => {
            return entity.collectionType !== 'module' && entity.moduleName === moduleName;
        });

        for (const collectionDescriptor of collectionDescriptors) {
            const updates = await updateImportedEntityToModule(
                collectionDescriptor,
                getEntityDescriptorWithAlias(targetPath),
                {
                    skipExport: skipExportDeclaredCollections,
                },
            );
            await this.writeFile(
                targetPath,
                applyUpdates(updates, fs.readFileSync(targetPath).toString()),
            );
        }

        const rootPointDescriptor = detectRootPoint();

        if (rootPointDescriptor) {
            const updates = await updateImportedEntityToModule(
                getEntityDescriptorWithAlias(targetPath),
                rootPointDescriptor,
                {
                    asyncModule,
                },
            );
            await this.writeFile(
                rootPointDescriptor.absolutePath,
                applyUpdates(updates, fs.readFileSync(rootPointDescriptor.absolutePath).toString()),
            );
            result.update.push(rootPointDescriptor.absolutePath);
        }

        return result;
    }
}

interface ModuleCollectionUpdateOptions extends UpdateBaseOptions {
    skipExport?: boolean;
    asyncModule?: boolean;
}

export class ModuleCollectionUpdateFactory extends AbstractCollection implements AbstractCollection {
    public async generate({
        source,
        target,
        skipExport,
        asyncModule,
    }: ModuleCollectionUpdateOptions) {
        const result: CollectionGenerateResult = {
            create: [],
            update: [],
        };

        const sourceDescriptor = normalizeCLIPath(source, this.entities);
        const targetDescriptor = normalizeCLIPath(target, this.entities, 'module');

        if (!sourceDescriptor) {
            throw new Error(`Cannot find source entity with identifier: ${source}`);
        }

        if (!targetDescriptor) {
            throw new Error(`Cannot find target entity with identifier: ${target}`);
        }

        const updates = await updateImportedEntityToModule(sourceDescriptor, targetDescriptor, {
            skipExport,
            asyncModule,
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
