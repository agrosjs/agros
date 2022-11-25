import { isBasicProvider } from './is';
import {
    BaseProvider,
    BaseProviderWithValue,
    FactoryProvider,
    ModuleInstanceMetadata,
    Provider,
    ProviderToken,
    Type,
    ValueProvider,
} from './types';

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
    public getProviders() {
        return new Set(
            Array
                .from(this.metadata.providers)
                .concat(Array.from(this.metadata.components))
                .concat(
                    Array.from(this.importedModuleInstances).reduce(
                        (providerClasses, importedModuleInstance) => {
                            return providerClasses.concat(Array.from(importedModuleInstance.metadata.exports));
                        }, [] as Provider[],
                    ),
                )
                .concat(
                    Array.from(this.globalModuleInstances).reduce(
                        (providerClasses, globalModuleInstances) => {
                            return providerClasses.concat(Array.from(globalModuleInstances.metadata.exports));
                        }, [] as Provider[],
                    ),
                )
                .concat(Array.from(this.metadata.providers).filter((provider) => isBasicProvider(provider))),
        );
    }

    public getBaseProvider(providerKey: ProviderToken) {
        return Array.from(this.getProviders())
            .filter((provider) => {
                return isBasicProvider(provider);
            })
            .find((provider: BaseProvider) => provider.provide === providerKey) as BaseProviderWithValue;
    }

    public hasDependedProviderClass(providerKey: Type | ProviderToken) {
        const providers = this.getProviders();
        if (!isBasicProvider(providerKey)) {
            return providers.has(providerKey as Type);
        } else {
            return Boolean(Array.from(providers).find((provider: BaseProvider) => {
                return provider.provide === providerKey as ProviderToken;
            }));
        }
    }

    public async generateBaseProviderValue(provider: BaseProvider, createProviderInstance?: (Class: Type) => any) {
        if (!provider) {
            return Promise.reject(new Error(`Cannot initialize or retrieve provider with token ${provider.provide}`));
        }

        if ((provider as ValueProvider).useValue) {
            return (provider as ValueProvider).useValue;
        } else if ((provider as FactoryProvider).useFactory) {
            const {
                useFactory,
                inject = [],
            } = provider as FactoryProvider;

            return new Promise((resolve) => {
                Promise.all(inject.map((InjectedProviderClass) => {
                    return createProviderInstance(InjectedProviderClass);
                })).then((factoryParameters) => {
                    try {
                        useFactory(...factoryParameters).then((value) => resolve(value));
                    } catch (e) {
                        resolve(useFactory(...factoryParameters));
                    }
                });
            });
        } else {
            return undefined;
        }
    }
}
