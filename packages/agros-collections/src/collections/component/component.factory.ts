import {
    AbstractCollection,
    applyUpdates,
    CollectionGenerateResult,
    getEntityDescriptorWithAlias,
    normalizeCLIPath,
    normalizeEntityFileName,
    normalizeNoExtensionPath,
    transformPathToAliasedPath,
    UpdateBaseOptions,
    updateImportedEntityToComponent,
    updateImportedEntityToModule,
} from '@agros/common';
import * as path from 'path';
import _ from 'lodash';
import * as fs from 'fs';

interface ComponentCollectionGenerateOptions {
    name: string;
    moduleName?: string;
    lazy?: boolean;
    skipExport?: boolean;
}

export class ComponentCollectionGenerateFactory extends AbstractCollection implements AbstractCollection {
    public async generate({
        name,
        moduleName,
        lazy,
        skipExport,
    }: ComponentCollectionGenerateOptions) {
        if (!name) {
            throw new Error('Expect `name` to be of type `string`');
        }

        const result: CollectionGenerateResult = {
            create: [],
            update: [],
        };

        const componentName = _.kebabCase(name);
        const declarationName = _.startCase(componentName).replace(/\s+/g, '');
        const serviceModuleName = moduleName ? _.kebabCase(moduleName) : componentName;
        const componentFilename = normalizeEntityFileName('component', componentName, '*.component.ts');
        const componentDeclarationTargetPath = this.modulesPath(`${serviceModuleName}/${componentFilename}`);
        const componentDescriptionTargetPath = this.modulesPath(`${serviceModuleName}/${declarationName}.tsx`);

        await this.writeTemplateFile(
            path.resolve(__dirname, 'files/component.ts._'),
            componentDeclarationTargetPath,
            {
                name: declarationName,
                file: transformPathToAliasedPath(normalizeNoExtensionPath(componentDescriptionTargetPath)),
                ...(lazy ? { lazy: true } : {}),
            },
        );
        result.create.push(componentDeclarationTargetPath);

        await this.writeTemplateFile(
            path.resolve(__dirname, 'files/component.normal.tsx._'),
            componentDescriptionTargetPath,
            {
                name: declarationName,
            },
        );
        result.create.push(componentDescriptionTargetPath);
        this.updateEntities();

        const moduleEntityDescriptor = this.entities.find((entity) => {
            return entity.collectionType === 'module' && entity.moduleName === serviceModuleName;
        });

        if (moduleEntityDescriptor) {
            const updates = await updateImportedEntityToModule(
                getEntityDescriptorWithAlias(componentDeclarationTargetPath),
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

type ComponentCollectionUpdateOptions = UpdateBaseOptions;

export class ComponentCollectionUpdateFactory extends AbstractCollection implements AbstractCollection {
    public async generate({
        source,
        target,
    }: ComponentCollectionUpdateOptions) {
        const result: CollectionGenerateResult = {
            create: [],
            update: [],
        };

        const sourceDescriptor = normalizeCLIPath(source, this.entities);
        const targetDescriptor = normalizeCLIPath(target, this.entities, 'component');

        if (!sourceDescriptor) {
            throw new Error(`Cannot find source entity with identifier: ${source}`);
        }

        if (!targetDescriptor) {
            throw new Error(`Cannot find target entity with identifier: ${target}`);
        }

        const updates = await updateImportedEntityToComponent(sourceDescriptor, targetDescriptor, {});

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
