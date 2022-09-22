import {
    addImportedEntityToModule,
    applyAddUpdates,
} from '@agros/tools/lib/update-utils';
import {
    AbstractGeneratorFactory,
    CollectionFactoryResult,
    UpdateBaseOptions,
} from '@agros/tools/lib/collection';
import {
    normalizeCLIPath,
    normalizeEntityFileName,
} from '@agros/tools/lib/normalizers';
import * as path from 'path';
import _ from 'lodash';
import * as fs from 'fs';
import { detectRootPoint } from '@agros/tools/lib/detectors';

interface ModuleCollectionGenerateOptions {
    name: string;
    async?: boolean;
    global?: boolean;
    skipDeclareCollections?: boolean;
    skipExportDeclaredCollections?: boolean;
}

export class ModuleCollectionGenerateFactory extends AbstractGeneratorFactory implements AbstractGeneratorFactory {
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

        const result: CollectionFactoryResult = {
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
            const updates = await addImportedEntityToModule(
                collectionDescriptor,
                this.getEntityDescriptor(targetPath),
                {
                    skipExport: skipExportDeclaredCollections,
                },
            );
            await this.writeFile(
                targetPath,
                applyAddUpdates(updates, fs.readFileSync(targetPath).toString()),
            );
        }

        const rootPointDescriptor = detectRootPoint();

        if (rootPointDescriptor) {
            const updates = await addImportedEntityToModule(
                this.getEntityDescriptor(targetPath),
                rootPointDescriptor,
                {
                    asyncModule,
                },
            );
            await this.writeFile(
                rootPointDescriptor.absolutePath,
                applyAddUpdates(updates, fs.readFileSync(rootPointDescriptor.absolutePath).toString()),
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

export class ModuleCollectionUpdateFactory extends AbstractGeneratorFactory implements AbstractGeneratorFactory {
    public async generate({
        source,
        target,
        skipExport,
        asyncModule,
    }: ModuleCollectionUpdateOptions) {
        const result: CollectionFactoryResult = {
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

        const updates = await addImportedEntityToModule(sourceDescriptor, targetDescriptor, {
            skipExport,
            asyncModule,
        });

        if (updates.length > 0) {
            this.writeFile(
                targetDescriptor.absolutePath,
                applyAddUpdates(updates, fs.readFileSync(targetDescriptor.absolutePath).toString()),
            );
            result.update.push(targetDescriptor.absolutePath);
        }

        return result;
    }
}
