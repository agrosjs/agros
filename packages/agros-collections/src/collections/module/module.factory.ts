import {
    AbstractCollection,
    applyUpdates,
    CollectionGenerateResult,
    getEntityDescriptorWithAlias,
    normalizeEntityFileName,
    updateImportedEntityToModule,
} from '@agros/common';
import * as path from 'path';
import _ from 'lodash';
import * as fs from 'fs';

interface ModuleCollectionOptions {
    name: string;
    skipDeclareCollections?: boolean;
    skipExportDeclaredCollections?: boolean;
}

class ModuleCollectionFactory extends AbstractCollection implements AbstractCollection {
    public async generate({
        name,
        skipDeclareCollections,
        skipExportDeclaredCollections,
    }: ModuleCollectionOptions) {
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

        this.writeTemplateFile(
            path.resolve(__dirname, 'files/module.ts._'),
            targetPath,
            {
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
                    noExport: skipExportDeclaredCollections,
                },
            );
            this.writeFile(
                targetPath,
                applyUpdates(updates, fs.readFileSync(targetPath).toString()),
            );
        }

        return result;
    }
}

export default ModuleCollectionFactory;
