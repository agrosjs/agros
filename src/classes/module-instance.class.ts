import {
    ModuleInstanceMetadata,
    Type,
} from '../types';

export class ModuleInstance {
    private importedModuleInstances = new Set<ModuleInstance>();

    public constructor(
        public readonly metadata: ModuleInstanceMetadata,
    ) {}

    public addImportedModuleInstance(moduleInstance: ModuleInstance) {
        this.importedModuleInstances.add(moduleInstance);
    }

    public getImportedModuleInstances() {
        return new Set(this.importedModuleInstances);
    }

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
