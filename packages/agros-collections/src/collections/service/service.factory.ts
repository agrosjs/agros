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

interface ServiceCollectionOptions {
    name: string;
    moduleName?: string;
    skipExport?: boolean;
}

class ServiceCollectionFactory extends AbstractCollection implements AbstractCollection {
    public async generate({
        name,
        moduleName,
        skipExport,
    }: ServiceCollectionOptions) {
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
                getEntityDescriptorWithAlias(targetPath),
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

export default ServiceCollectionFactory;
