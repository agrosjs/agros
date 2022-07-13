import {
    AbstractCollection,
    getEntityDescriptorWithAlias,
    normalizeEntityFileName,
    updateImportedEntityToModule,
} from '@agros/common';
import * as path from 'path';
import _ from 'lodash';

interface ServiceCollectionOptions {
    name: string;
    moduleName?: string;
    noExport?: boolean;
}

class ServiceCollectionFactory extends AbstractCollection implements AbstractCollection {
    public async generate({
        name,
        moduleName,
        noExport,
    }: ServiceCollectionOptions) {
        if (!name) {
            throw new Error('Expect `name` to be of type `string`');
        }

        const serviceName = _.kebabCase(name);
        const serviceModuleName = moduleName
            ? _.kebabCase(moduleName)
            : serviceName;
        const filename = normalizeEntityFileName('service', serviceName, '*.service.ts');

        const targetPath = this.modulesPath(`${serviceModuleName}/${filename}`);

        this.writeTemplateFile(
            path.resolve(__dirname, 'files/service.ts._'),
            targetPath,
            { name: serviceName },
        );

        this.updateEntities();

        const moduleEntityDescriptor = this.entities.find((entity) => {
            return entity.collectionType === 'module' && entity.entityName === serviceModuleName;
        });

        if (moduleEntityDescriptor) {
            await updateImportedEntityToModule(
                getEntityDescriptorWithAlias(targetPath),
                moduleEntityDescriptor,
                { noExport },
            );
        }
    }
}

export default ServiceCollectionFactory;
