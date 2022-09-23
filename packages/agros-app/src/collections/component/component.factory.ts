import {
    applyAddUpdates,
    addImportedEntityToComponent,
    addImportedEntityToModule,
} from '@agros/tools/lib/update-utils';
import {
    AbstractGeneratorFactory,
    AbstractUpdaterFactory,
    CollectionFactoryResult,
    UpdateBaseOptions,
} from '@agros/tools/lib/collection';
import {
    normalizeCLIPath,
    normalizeEntityFileName,
    normalizeNoExtensionPath,
} from '@agros/tools/lib/normalizers';
import { transformPathToAliasedPath } from '@agros/tools/lib/transformers';
import * as path from 'path';
import _ from 'lodash';
import * as fs from 'fs';
import { updateCorrespondingTargetModule } from '../utils';
import { PlatformConfigParser } from '@agros/tools/lib/config-parsers';

interface ComponentCollectionGenerateOptions {
    name: string;
    moduleName?: string;
    lazy?: boolean;
    skipExport?: boolean;
}

export class ComponentCollectionGenerateFactory extends AbstractGeneratorFactory implements AbstractGeneratorFactory {
    public async generate({
        name,
        moduleName,
        lazy,
        skipExport,
    }: ComponentCollectionGenerateOptions) {
        if (!name) {
            throw new Error('Expect `name` to be of type `string`');
        }

        const result: CollectionFactoryResult = {
            create: [],
            update: [],
        };
        const platformConfig = new PlatformConfigParser(
            this.projectConfig.getConfig<string>('platform'),
        );
        const componentName = _.kebabCase(name);
        const declarationName = _.startCase(componentName).replace(/\s+/g, '');
        const componentModuleName = moduleName ? _.kebabCase(moduleName) : componentName;
        const componentdeclarationFilename = normalizeEntityFileName('component', componentName, '*.component.ts');
        const componentDeclarationTargetPath = this.modulesPath(`${componentModuleName}/${componentdeclarationFilename}`);
        const componentDescriptionFilepath = platformConfig.getConfig<string>('files.generate.componentDescription');
        const componentDescriptionTargetPathWithoutExtension = this.modulesPath(`${componentModuleName}/${declarationName}`);
        const componentDescriptionExtension = path.extname(componentDescriptionFilepath.replace(/\.\_$/g, ''));
        const componentDescriptionTargetPath = `${componentDescriptionTargetPathWithoutExtension}${componentDescriptionExtension}`;

        await this.writeTemplateFile(
            path.resolve(__dirname, './files/component.ts._'),
            componentDeclarationTargetPath,
            {
                name: declarationName,
                file: transformPathToAliasedPath(
                    platformConfig.getConfig<boolean>('withoutComponentDescriptionFileExtension')
                        ? normalizeNoExtensionPath(componentDescriptionTargetPath)
                        : componentDescriptionTargetPath,
                ),
                ...(lazy ? { lazy: true } : {}),
            },
        );
        result.create.push(componentDeclarationTargetPath);

        await this.writeTemplateFile(
            componentDescriptionFilepath,
            componentDescriptionTargetPath,
            {
                name: declarationName,
            },
        );
        result.create.push(componentDescriptionTargetPath);
        this.updateEntities();

        const moduleEntityDescriptor = this.entities.find((entity) => {
            return entity.collectionType === 'module' && entity.moduleName === componentModuleName;
        });

        if (moduleEntityDescriptor) {
            const updates = await addImportedEntityToModule(
                this.getEntityDescriptor(componentDeclarationTargetPath),
                moduleEntityDescriptor,
                {
                    skipExport,
                },
            );
            await this.writeFile(
                moduleEntityDescriptor.absolutePath,
                applyAddUpdates(updates, fs.readFileSync(moduleEntityDescriptor.absolutePath).toString()),
            );
            result.update.push(moduleEntityDescriptor.absolutePath);
        }

        return result;
    }
}

type ComponentCollectionUpdateOptions = UpdateBaseOptions;

export class ComponentCollectionUpdateFactory extends AbstractUpdaterFactory implements AbstractUpdaterFactory {
    public async add({
        source,
        target,
    }: ComponentCollectionUpdateOptions) {
        const result: CollectionFactoryResult = {
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

        const updates = await addImportedEntityToComponent(sourceDescriptor, targetDescriptor, {});

        if (updates.length > 0) {
            this.writeFile(
                targetDescriptor.absolutePath,
                applyAddUpdates(updates, fs.readFileSync(targetDescriptor.absolutePath).toString()),
            );
            result.update.push(targetDescriptor.absolutePath);
        }

        const [
            sourceModuleUpdates,
            targetModuleUpdates,
        ] = await updateCorrespondingTargetModule(sourceDescriptor, targetDescriptor);

        if (sourceModuleUpdates.length > 0) {
            const absolutePath = sourceDescriptor.modules[0]?.absolutePath;
            this.writeFile(
                absolutePath,
                applyAddUpdates(sourceModuleUpdates, fs.readFileSync(absolutePath).toString()),
            );
            result.update.push(source);
        }

        if (targetModuleUpdates.length > 0) {
            const absolutePath = targetDescriptor.modules[0]?.absolutePath;
            this.writeFile(
                absolutePath,
                applyAddUpdates(targetModuleUpdates, fs.readFileSync(absolutePath).toString()),
            );
            result.update.push(absolutePath);
        }

        return result;
    }
}
