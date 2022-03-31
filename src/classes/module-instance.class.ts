import {
    ModuleInstanceMetadata,
    Type,
} from '../types';

/**
 * @class
 * a class for storing imported module instances and methods
 */
export class ModuleInstance {
    private importedModuleInstances = new Set<ModuleInstance>();

    /**
     * @constructor
     * @param {ModuleInstanceMetadata} metadata
     */
    public constructor(
        public readonly metadata: ModuleInstanceMetadata,
        private readonly globalModuleInstances: Set<ModuleInstance>,
    ) {}

    public addImportedModuleInstance(moduleInstance: ModuleInstance) {
        if (
            !Array
                .from(this.importedModuleInstances)
                .some((instance) => instance.metadata.Class === moduleInstance.metadata.Class)
        ) {
            this.importedModuleInstances.add(moduleInstance);
        }
    }

    public getImportedModuleInstances() {
        return new Set(this.importedModuleInstances);
    }

    /**
     * @public
     * get provider classes recursively from imported modules
     */
    public getProviderClasses() {
        return new Set(
            Array
                .from(this.metadata.providers)
                .concat(Array.from(this.metadata.components))
                .concat(
                    Array.from(this.importedModuleInstances).reduce(
                        (providerClasses, importedModuleInstance) => {
                            return providerClasses.concat(Array.from(importedModuleInstance.metadata.exports));
                        }, [] as Type[],
                    ),
                )
                .concat(
                    Array.from(this.globalModuleInstances).reduce(
                        (providerClasses, globalModuleInstances) => {
                            return providerClasses.concat(Array.from(globalModuleInstances.metadata.exports));
                        }, [] as Type[],
                    ),
                ),
        );
    }

    public hasDependedProviderClass(ProviderClass: Type) {
        return this.getProviderClasses().has(ProviderClass);
    }
}
