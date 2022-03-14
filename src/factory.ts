import 'reflect-metadata';
import {
    DI_DEPS_SYMBOL,
    DI_IMPORTS_SYMBOL,
    DI_PROVIDERS_SYMBOL,
} from './constants';
import {
    ModuleInstance,
    Type,
} from './types';

export class Factory {
    private moduleInstances: Map<any, any> = new Map();

    public create(module: Type) {
        const imports: Set<Type> = Reflect.getMetadata(DI_IMPORTS_SYMBOL, module);
        const providers: Set<any> = Reflect.getMetadata(DI_PROVIDERS_SYMBOL, module);
        const providersMap = new Map();

        const importModules = Array.from(imports).map((importModule) => {
            let moduleInstance: ModuleInstance = this.moduleInstances.get(importModule);

            if (!moduleInstance) {
                moduleInstance = this.create(importModule);
                this.moduleInstances.set(importModule, moduleInstance);
            }

            return moduleInstance;
        });

        const moduleInstance = new ModuleInstance(importModules, providersMap);

        providers.forEach((Provider) => {
            this.createProvider(Provider, providers, moduleInstance);
        });

        return moduleInstance;
    }

    private createProvider(Provider: any, providers: Set<any>, moduleInstance: ModuleInstance) {
        let providerInstance = moduleInstance.providers.get(Provider);

        if (providerInstance) {
            return providerInstance;
        }

        const deps: Array<any> = Reflect.getMetadata(DI_DEPS_SYMBOL, Provider);

        if (!deps) {
            throw new Error(`No provider named ${ Provider.name }, do yout add @Injectable() to this provider?`);
        }

        const args = deps.map((dep) => {
            let depInstance = moduleInstance.providers.get(dep);

            if (!depInstance) {
                if (providers.has(dep)) {
                    depInstance = this.createProvider(dep, providers, moduleInstance);
                } else {
                    moduleInstance.imports.some((imp) => {
                        depInstance = this.createProvider(dep, new Set(), imp);
                        return !!depInstance;
                    });
                }
            }

            if (!depInstance) {
                throw new Error(`Cannot found provider ${ dep.name }`);
            }

            return depInstance;
        });

        providerInstance = new Provider(...args);
        moduleInstance.providers.set(Provider, providerInstance);

        return providerInstance;
    }
}
