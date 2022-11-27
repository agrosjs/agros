import 'reflect-metadata';
import { PROVIDER_MODULE } from './constants';
import { isBasicProvider } from './is';
import {
    BaseProvider,
    BaseProviderWithValue,
    DynamicModuleListItem,
    FactoryProvider,
    ModuleInstanceMetadata,
    ProviderToken,
    ProviderWithValue,
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
        private readonly dynamicModuleInstanceList: DynamicModuleListItem[],
    ) {
        this.metadata.providers = new Set(
            Array.from(this.metadata.providers).map((provider) => {
                if (isBasicProvider(provider)) {
                    Reflect.defineMetadata(PROVIDER_MODULE, this.metadata.Class, provider);
                    (provider as BaseProviderWithValue).value = undefined;
                }
                return provider;
            }),
        );
    }

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
    public getProviders(): Set<any> {
        const result = new Set(
            Array
                .from(this.metadata.providers)
                .concat(Array.from(this.metadata.components))
                .concat(
                    Array.from(this.importedModuleInstances).reduce(
                        (providerClasses, importedModuleInstance) => {
                            return providerClasses
                                .concat(Array.from(importedModuleInstance.metadata.exports))
                                .concat(
                                    Array
                                        .from(importedModuleInstance.getProviders())
                                        .filter((provider) => isBasicProvider(provider)) as ProviderWithValue[],
                                );
                        }, [] as ProviderWithValue[],
                    ),
                )
                .concat(
                    Array.from(this.dynamicModuleInstanceList).reduce(
                        (providerClasses, {
                            moduleInstance: dynamicModuleInstance,
                            HostModuleClass,
                        }) => {
                            if (HostModuleClass !== this.metadata.Class) {
                                return providerClasses;
                            }

                            return providerClasses
                                .concat(Array.from(dynamicModuleInstance.metadata.exports))
                                .concat(
                                    Array
                                        .from(dynamicModuleInstance.getProviders())
                                        .filter((provider) => isBasicProvider(provider)) as ProviderWithValue[],
                                );
                        }, [] as ProviderWithValue[],
                    ),
                )
                .concat(
                    Array.from(this.globalModuleInstances).reduce(
                        (providerClasses, globalModuleInstances) => {
                            return providerClasses.concat(Array.from(globalModuleInstances.metadata.exports));
                        }, [] as ProviderWithValue[],
                    ),
                ),
        );
        return result;
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
            return Promise.reject(new Error(`Cannot initialize or retrieve provider with token ${String(provider.provide)}`));
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

    public setBaseProviderWithValue(providerToken: ProviderToken, baseProviderWithValue: BaseProviderWithValue) {
        const providers = Array.from(this.metadata.providers);
        const providerIndex = providers.findIndex((provider) => {
            return isBasicProvider(provider) && (provider as BaseProviderWithValue).provide === providerToken;
        });

        if (providerIndex === -1) {
            return;
        }

        providers[providerIndex] = baseProviderWithValue;
        this.metadata.providers = new Set(providers);
    }
}
