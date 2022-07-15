import {
    AbstractCollection,
    applyUpdates,
    CollectionGenerateResult,
    getEntityDescriptorWithAlias,
    normalizeEntityFileName,
    transformPathToAliasedPath,
    updateImportedEntityToModule,
} from '@agros/common';
import * as path from 'path';
import _ from 'lodash';
import * as fs from 'fs';

interface ComponentCollectionOptions {
    name: string;
    moduleName?: string;
    forwardMode?: boolean;
    lazy?: boolean;
    skipExport?: boolean;
}

class ComponentCollectionFactory extends AbstractCollection implements AbstractCollection {
    public async generate({
        name,
        moduleName,
        forwardMode,
        lazy,
        skipExport,
    }: ComponentCollectionOptions) {
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
        const componentTargetPath = this.modulesPath(`${serviceModuleName}/${componentFilename}`);
        const declarationTargetPath = this.modulesPath(`${serviceModuleName}/${declarationName}.tsx`);

        await this.writeTemplateFile(
            path.resolve(__dirname, 'files/component.ts._'),
            componentTargetPath,
            {
                name: declarationName,
                file: transformPathToAliasedPath(declarationTargetPath),
                ...(lazy ? { lazy: true } : {}),
            },
        );
        result.create.push(componentTargetPath);

        await this.writeTemplateFile(
            path.resolve(__dirname, `files/component.${forwardMode ? 'forward-container' : 'normal'}.tsx._`),
            declarationTargetPath,
            {
                name: declarationName,
            },
        );
        result.create.push(componentTargetPath);
        this.updateEntities();

        const moduleEntityDescriptor = this.entities.find((entity) => {
            return entity.collectionType === 'module' && entity.moduleName === serviceModuleName;
        });

        if (moduleEntityDescriptor) {
            const updates = await updateImportedEntityToModule(
                getEntityDescriptorWithAlias(componentTargetPath),
                moduleEntityDescriptor,
                {
                    noExport: skipExport,
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

export default ComponentCollectionFactory;
