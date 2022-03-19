import {
    ModuleInstanceMetadata,
    Type,
} from '../types';

export class ModuleInstance {
    private providerInstanceMap = new Map<Type<any>, any>();
    private importedModuleInstances = new Set<ModuleInstance>();

    public constructor(
        public readonly metadata: ModuleInstanceMetadata,
    ) {}

    public addProviderInstance(ProviderClass: Type, providerInstance: any) {
        this.providerInstanceMap.set(ProviderClass, providerInstance);
    }

    public getProviderInstances<T>(ProviderClass: Type<T>): T[] {
        if (ProviderClass) {
            const providerInstance = this.providerInstanceMap.get(ProviderClass);
            return providerInstance
                ? [providerInstance]
                : [];
        }

        return Array.from(
            this.providerInstanceMap.values(),
        ).map(([, providerInstance]) => providerInstance);
    }

    public addImportedModuleInstance(moduleInstance: ModuleInstance) {
        this.importedModuleInstances.add(moduleInstance);
    }

    public getImportedModuleInstances() {
        return new Set(this.importedModuleInstances);
    }

    public getProviderClasses() {
        return new Set(
            Array.from(this.metadata.providers).concat(
                Array.from(this.importedModuleInstances).reduce((providerClasses, importedModuleInstance) => {
                    return providerClasses.concat(Array.from(importedModuleInstance.metadata.providers));
                }, [] as Type[]),
            ),
        );
    }

    public getProviderInstanceMap() {
        const currentProviderInstanceMap = new Map({
            ...this.providerInstanceMap,
            ...Array.from(this.importedModuleInstances).reduce((providerInstanceMap, moduleInstance) => {
                const currentProviderInstanceMap = moduleInstance.getProviderInstanceMap();
                return new Map(
                    ...providerInstanceMap,
                    ...currentProviderInstanceMap,
                );
            }, new Map()),
        });

        return currentProviderInstanceMap;
    }

    public hasDependedProviderClass(ProviderClass: Type) {
        return this.getProviderClasses().has(ProviderClass);
    }

    // public get<T>(provider: Type<T>) {
    //     let instance: T = this.providers.get(provider);

    //     if (!instance) {
    //         this.imports.some((imp) => {
    //             instance = imp.get(provider);
    //             return !!instance;
    //         });
    //     }

    //     if (!instance) {
    //         throw new Error(`No provider named: ${provider.name}`);
    //     }

    //     return instance;
    // }
}
