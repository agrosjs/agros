import 'reflect-metadata';
import {
    AbstractView,
    ModuleInstance,
} from './classes';
import {
    DI_DEPS_SYMBOL,
    DI_IMPORTS_SYMBOL,
    DI_PROVIDERS_SYMBOL,
    DI_VIEWS_SYMBOL,
} from './constants';
import {
    Type,
    ViewItem,
    ViewMetadata,
} from './types';

export class Factory {
    private moduleInstances: Map<any, any> = new Map();
    private routeViews: Set<ViewItem> = new Set();

    public createModule(module: Type) {
        const imports: Set<Type> = Reflect.getMetadata(DI_IMPORTS_SYMBOL, module);
        const providers: Set<any> = Reflect.getMetadata(DI_PROVIDERS_SYMBOL, module);
        const moduleViews: Set<Type<AbstractView>> = Reflect.getMetadata(DI_VIEWS_SYMBOL, module);

        const providersMap = new Map();

        const importedModules = Array.from(imports).map((importModule) => {
            let moduleInstance: ModuleInstance = this.moduleInstances.get(importModule);

            if (!moduleInstance) {
                moduleInstance = this.createModule(importModule);
                this.moduleInstances.set(importModule, moduleInstance);
            }

            return moduleInstance;
        });

        const moduleInstance = new ModuleInstance(
            importedModules,
            providersMap,
            Array.from(this.routeViews),
        );

        const registeredProviders = Array
            .from(providers)
            .map((Provider) => {
                return {
                    clazz: Provider,
                    instance: this.createProvider(Provider, providers, moduleInstance),
                };
            });

        registeredProviders.forEach((data) => {
            const { clazz, instance } = data;
            moduleInstance.providers.set(clazz, instance);
        });

        Array
            .from(moduleViews)
            .forEach((View) => {
                const viewMetadata: ViewMetadata = Reflect.getMetadata(DI_VIEWS_SYMBOL, View);
                const { options } = viewMetadata;
                const instance = this.createView(View, moduleInstance);

                this.routeViews.add({ instance, options } as ViewItem);
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
            throw new Error(`No provider named ${Provider.name}, did you add @Injectable() to this provider?`);
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
                throw new Error(`Cannot found provider ${dep.name}`);
            }

            return depInstance;
        });

        providerInstance = new Provider(...args);

        return providerInstance;
    }

    private createView(View: Type<AbstractView>, moduleInstance: ModuleInstance) {
        const metadata: ViewMetadata = Reflect.getMetadata(DI_VIEWS_SYMBOL, View);
        const providersMap: Map<any, any> = moduleInstance.providers;

        const { dependencies: deps } = metadata;

        if (!deps) {
            throw new Error(`No provider named ${View.name}, did you add @View() to this provider?`);
        }

        const args = deps.map((dep) => {
            const depInstance = providersMap.get(dep);

            if (!depInstance) {
                throw new Error(`Dependency ${dep.name} not found, did you add it to 'imports' parameter?`);
            }

            return depInstance;
        });

        return new View(...args);
    }
}
