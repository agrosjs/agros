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
    ) {}

    public addImportedModuleInstance(moduleInstance: ModuleInstance) {
        this.importedModuleInstances.add(moduleInstance);
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
                ),
        );
    }

    public hasDependedProviderClass(ProviderClass: Type) {
        return this.getProviderClasses().has(ProviderClass);
    }
}
