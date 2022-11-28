import 'reflect-metadata';
import { Map as ImmutableMap } from 'immutable';
import {
    ModuleMetadata,
    Type,
    ComponentMetadata,
    Factory as IFactory,
    Interceptor,
    AsyncModuleClass,
    ComponentInstance,
    ModuleInstance,
    Platform,
    DynamicModule,
    Provider,
    BaseProvider,
    ProviderToken,
    BaseProviderWithValue,
    isBasicProvider,
    PROVIDER_MODULE,
    ProviderWithValue,
    isDynamicModule,
} from '@agros/tools';
import isPromise from 'is-promise';
import {
    DI_DEPS_SYMBOL,
    DI_GLOBAL_MODULE_SYMBOL,
    DI_METADATA_COMPONENT_SYMBOL,
    DI_METADATA_MODULE_SYMBOL,
    DI_METADATA_USE_INTERCEPTORS_SYMBOL,
    IS_DYNAMIC_MODULE,
    SELF_DECLARED_DEPS_METADATA,
} from '@agros/common';

interface ParameterDep<T = any> {
    index: number;
    param: T;
}

interface SelfDeclaredDep<T = any> {
    key: ProviderToken;
    type: T;
}

export class Factory implements IFactory {
    /**
     * @private
     * the flattened map for all module instances created from module classes
     */
    private moduleInstanceMap = new Map<Type<any>, ModuleInstance>();
    /**
     * @private
     * the flattened map for all provider instances exported by modules
     */
    private providerInstanceMap = new Map<Type<any>, any>();
    /**
     * @private
     * the flattened map for all provider instances provided by modules
     */
    private componentInstanceMap = new Map<Type<any>, ComponentInstance>();
    /**
     * @private
     * a map for storing provider class to module class relationship
     */
    private providerClassToModuleClassMap = new Map<Type<any>, Type>();
    /**
     * @private
     * a map for storing component class to module class relationship
     */
     private componentClassToModuleClassMap = new Map<Type, Type>();
    /**
     * @private
     * global module instances
     */
    private globalModuleInstances = new Set<ModuleInstance>();
    private rootModuleInstance: ModuleInstance;

    public constructor(protected readonly platform: Platform) {}

    /**
     * @async
     * @public
     * @method
     * @param {Type<T>} ModuleClass
     * @returns {Promise<RouteItem[]>}
     *
     * create a route config with the root module
     */
    public async create<T = any>(ModuleClass: Type<T>): Promise<ComponentInstance> {
        const rootModuleInstance = await this.createModuleInstance(ModuleClass, ModuleClass);

        const rootModuleExportedComponentClasses = Array
            .from(rootModuleInstance.metadata?.exports || new Set<Type>())
            .filter((ExportedClass) => {
                return Boolean(
                    Reflect.getMetadata(
                        DI_METADATA_COMPONENT_SYMBOL,
                        ExportedClass,
                    ),
                );
            });

        if (rootModuleExportedComponentClasses.length !== 1) {
            throw new Error(`Root module is expected to export one component class, but got ${rootModuleExportedComponentClasses.length}`);
        }

        await this.setImportedModuleInstances();
        this.createProviderClassToModuleClassMap();
        await this.createProviderInstances(rootModuleInstance);
        await this.createAllBasicProviderInstances();
        this.createComponentInstances(rootModuleInstance);
        await this.generateComponentForInstances();
        this.rootModuleInstance = rootModuleInstance;
        await this.initializeSelfDeclaredDepsForProviders();
        const [RootComponentClass] = rootModuleExportedComponentClasses;

        return Array.from(this.componentInstanceMap.values()).find((componentInstance) => {
            return componentInstance.metadata.Class === RootComponentClass;
        });
    }

    public getModuleInstanceMap() {
        return this.moduleInstanceMap;
    }

    public getRootModuleInstance() {
        return this.rootModuleInstance;
    }

    public getComponentInstanceMap() {
        return this.componentInstanceMap;
    }

    /**
     * generate dependency map that can be used by `declarations.get` method
     *
     * @returns {Map<ClassType, any>} a map for storing relationships between provider class
     * and provider instance, when the provider class infers to a component class, its value
     * would be a component
     */
    public generateDependencyMap(componentInstanceOrId: ComponentInstance | string): ImmutableMap<Type<any>, any> {
        let componentInstance: ComponentInstance;

        if (typeof componentInstanceOrId === 'string') {
            componentInstance = Array.from(this.componentInstanceMap.values()).find((instance) => {
                return instance.metadata.uuid === componentInstanceOrId;
            });
        } else {
            componentInstance = componentInstanceOrId;
        }

        if (!componentInstance) {
            return ImmutableMap();
        }

        const ComponentClass = componentInstance.metadata.Class;
        const dependedClasses: Type[] = [
            DI_DEPS_SYMBOL,
            DI_METADATA_USE_INTERCEPTORS_SYMBOL,
        ].reduce((result, symbol) => {
            const classes = Reflect.getMetadata(symbol, componentInstance.metadata.Class) || [];
            return result.concat(classes);
        }, [] as Type[]);
        const moduleInstance = this.moduleInstanceMap.get(
            this.componentClassToModuleClassMap.get(ComponentClass),
        );
        let dependencyMap = ImmutableMap<Type, any>();

        for (const ProviderClass of dependedClasses) {
            if (this.componentInstanceMap.get(ProviderClass)) {
                /**
                 * if provider class is a component class, that set the map value
                 * to a component
                 */
                const dependedComponentInstance = this.componentInstanceMap.get(ProviderClass);
                let dependedComponent = dependedComponentInstance.getComponent();

                /**
                 * get the component from depended component class
                 */
                dependencyMap = dependencyMap.set(ProviderClass, dependedComponent);
            } else {
                /**
                 * if provider class is a normal provider class, than get the provider
                 * instance by provider class and set it to the map value
                 */
                if (moduleInstance.hasDependedProviderClass(ProviderClass)) {
                    dependencyMap = dependencyMap.set(
                        ProviderClass,
                        this.providerInstanceMap.get(ProviderClass),
                    );

                    if (!dependencyMap.get(ProviderClass)) {
                        throw new Error(`Cannot find provider ${ProviderClass.name} that can be injected`);
                    }
                } else {
                    throw new Error(`Cannot inject provider ${ProviderClass.name} into component ${ComponentClass.name}`);
                }
            }
        }

        return dependencyMap;
    }

    /**
     * @async
     * @param {Type} ModuleClassOrPromise
     * @returns {Promise<void>}
     *
     * create flattened module instances using a root module class
     * this is a recursive function
     */
    private async createModuleInstance<T>(
        HostModuleClass: Type<T>,
        ModuleClassOrPromiseOrDynamicModule: Type<T> | Promise<Type<T>>,
    ) {
        let ModuleClass: Type<any> = await this.getModuleClassExceptDynamicModule(ModuleClassOrPromiseOrDynamicModule);
        const isDynamicModule = Reflect.getMetadata(IS_DYNAMIC_MODULE, ModuleClass);
        let currentModuleInstance: ModuleInstance;

        if (!this.moduleInstanceMap.get(ModuleClass) || isDynamicModule) {
            const metadataValue: ModuleMetadata = !isDynamicModule
                ? Reflect.getMetadata(
                    DI_METADATA_MODULE_SYMBOL,
                    ModuleClass,
                )
                : (Reflect.getMetadata(
                    DI_METADATA_MODULE_SYMBOL,
                    ModuleClass,
                ) as ImmutableMap<Type, ModuleMetadata>).get(HostModuleClass);
            const isGlobal: boolean = Reflect.getMetadata(DI_GLOBAL_MODULE_SYMBOL, ModuleClass) || false;
            const {
                imports,
                providers,
                components,
                exports: exportedProviders,
            } = metadataValue;
            /**
             * create current module instance by module class
             */
            const moduleInstance = new ModuleInstance(
                {
                    Class: ModuleClass,
                    isGlobal,
                    imports: new Set(Array.from(imports).map((imported) => this.processDynamicModule(ModuleClass, imported))),
                    providers: new Set(Array.from(providers).map((provider) => {
                        if (isBasicProvider(provider)) {
                            (provider as BaseProviderWithValue).value = undefined;
                        }
                        return provider;
                    }) as ProviderWithValue[]),
                    exports: new Set(exportedProviders),
                    components: new Set(components),
                },
                this.globalModuleInstances,
            );

            if (isDynamicModule) {
                const hostModuleInstance = this.moduleInstanceMap.get(HostModuleClass);

                if (hostModuleInstance) {
                    hostModuleInstance.addImportedModuleInstance(moduleInstance);
                }

                currentModuleInstance = moduleInstance;
            } else {
                this.moduleInstanceMap.set(ModuleClass, moduleInstance);
                currentModuleInstance = moduleInstance;
            }

            // if (ModuleClass.name === 'AppModule') {
            //     console.log('LENCONDA:', {
            //         HostModuleClass,
            //         currentModuleInstance,
            //         ModuleClass,
            //         metadataValue,
            //         imports: new Set(Array.from(imports).map((imported) => this.processDynamicModule(HostModuleClass, imported))),
            //     });
            // }
        }

        if (!currentModuleInstance) {
            currentModuleInstance = this.moduleInstanceMap.get(ModuleClass);
        }

        // console.log('CURRENT', currentModuleInstance);

        if (currentModuleInstance) {
            /**
             * get all imported module classes and create them recursively
             */
            for (const ImportedModuleClassOrPromise of currentModuleInstance.metadata.imports) {
                await this.createModuleInstance(ModuleClass, ImportedModuleClassOrPromise);
            }
        }

        return currentModuleInstance;
    }

    /**
     * @async
     * @private
     * @returns {Promise<void>}
     *
     * add imported module instances into every instance
     */
    private async setImportedModuleInstances() {
        for (const [ModuleClass, moduleInstance] of this.moduleInstanceMap.entries()) {
            for (const ImportedModuleClassOrPromise of Array.from(moduleInstance.metadata.imports)) {
                const ImportedModuleClass = await this.getModuleClassExceptDynamicModule(ImportedModuleClassOrPromise) as Type;

                if (ModuleClass === ImportedModuleClass) {
                    throw new Error(`Module ${ModuleClass.name} cannot import itself`);
                }

                const importedModuleInstance = this.moduleInstanceMap.get(ImportedModuleClass);

                if (!importedModuleInstance) {
                    continue;
                }

                if (importedModuleInstance.getImportedModuleInstances().has(moduleInstance)) {
                    throw new Error(`Cyclic dependence relation between ${ImportedModuleClass.name} and ${ModuleClass.name}, which is not allowed`);
                }

                moduleInstance.addImportedModuleInstance(importedModuleInstance);
            }

            if (moduleInstance.metadata.isGlobal) {
                this.globalModuleInstances.add(moduleInstance);
            }
        }
    }

    /**
     * @private
     * @returns {void}
     *
     * create a map for mapping provider class to module classes
     * in order to make it easier to find a module class who
     * provides a provider class
     */
    private createProviderClassToModuleClassMap() {
        for (const [, moduleInstance] of this.moduleInstanceMap) {
            for (const provider of moduleInstance.metadata.providers) {
                if (isBasicProvider(provider)) {
                    continue;
                }
                this.providerClassToModuleClassMap.set(
                    provider as Type,
                    moduleInstance.metadata.Class,
                );
            }
        }
    }

    /**
     * @async
     * @private
     * @returns {Promise<void>}
     *
     * create a single provider instance use provider class
     */
    private async createProviderInstance(provider: Provider<any>) {
        let providerKey: Type<any> | ProviderToken;
        let ModuleClass: Type<any>;
        let moduleInstance: ModuleInstance;

        if (!isBasicProvider(provider)) {
            const ProviderClass = provider as Type<any>;
            providerKey = ProviderClass;
            if (this.providerInstanceMap.get(ProviderClass)) {
                return this.providerInstanceMap.get(ProviderClass);
            }

            ModuleClass = this.providerClassToModuleClassMap.get(ProviderClass);
            moduleInstance = this.moduleInstanceMap.get(ModuleClass);
            const dependedProviderClasses = Reflect.getMetadata(DI_DEPS_SYMBOL, ProviderClass) as Array<Type | ParameterDep>;

            if (!Array.isArray(dependedProviderClasses)) {
                throw new Error(`Provider ${ProviderClass.name} cannot be injected, did you add \`@Injectable()\` into it?`);
            }

            /**
             * set to provider instance map directly so that other provider
             * who depends on it can get it during creating provider instances,
             * even if it does not be fully created.
             */
            this.providerInstanceMap.set(
                ProviderClass,
                new ProviderClass(
                    ...await Promise.all(dependedProviderClasses.map((dependedProvider) => {
                        if (dependedProvider === ProviderClass) {
                            throw new Error(`Provider ${ProviderClass.name} cannot depend on itself`);
                        }

                        if (!isBasicProvider(dependedProvider)) {
                            const DependedProviderClass = dependedProvider as Type<any>;
                            const dependedProviderName = DependedProviderClass.name;

                            /**
                             * get the module class that the provider depended on
                             */
                            const DependedModuleClass = this.providerClassToModuleClassMap.get(DependedProviderClass);

                            if (!DependedModuleClass) {
                                throw new Error(`Cannot find the module that provides ${dependedProviderName}, please make sure it is exported by a module`);
                            }

                            /**
                             * check depended provider class be exported from the module,
                             * if not, it will throw an error
                             */
                            if (!moduleInstance.hasDependedProviderClass(providerKey)) {
                                throw new Error(
                                    `Cannot inject provider ${dependedProviderName} into provider ${ProviderClass.name}, did you import ${DependedModuleClass.name}?`,
                                );
                            }

                            return this.createProviderInstance(DependedProviderClass);
                        } else {
                            const { param } = dependedProvider as ParameterDep;

                            if (!param) {
                                throw new Error(`Cannot get parameter name from token provider: ${dependedProvider}`);
                            }

                            if (!moduleInstance.hasDependedProviderClass(param)) {
                                throw new Error(`Cannot inject provider with token ${param} into provider ${ProviderClass.name}`);
                            }

                            const baseProvider = moduleInstance.getBaseProvider(param);

                            return this
                                .createProviderInstance(baseProvider)
                                .then((provider: BaseProviderWithValue) => provider?.value);
                            // .then((provider: BaseProvider) => moduleInstance.generateBaseProviderValue(provider, this.createProviderInstance.bind(this)));
                        }
                    })),
                ),
            );

            return this.providerInstanceMap.get(providerKey);
        } else {
            ModuleClass = Reflect.getMetadata(PROVIDER_MODULE, provider) as Type;
            providerKey = (provider as BaseProvider).provide;
            return await this.createBaseProviderInstance(ModuleClass, provider as BaseProviderWithValue);
        }

    }

    /**
     * @async
     * @private
     * @param {ModuleInstance} moduleInstance
     * @returns {Promise<void>}
     *
     * create provider instances from root module's providers
     */
    private async createProviderInstances(moduleInstance: ModuleInstance) {
        for (const ProviderClass of Array.from(moduleInstance.metadata.providers)) {
            await this.createProviderInstance(ProviderClass);
        }

        for (const importedModuleInstance of Array.from(moduleInstance.getImportedModuleInstances())) {
            await this.createProviderInstances(importedModuleInstance);
        }
    }

    /**
     * create component instances from root module instance
     *
     * @private
     * @param {ModuleInstance} moduleInstance
     */
    private createComponentInstances(moduleInstance: ModuleInstance) {
        const ModuleClass = moduleInstance.metadata.Class;

        for (const ComponentClass of Array.from(moduleInstance.metadata.components)) {
            this.componentClassToModuleClassMap.set(ComponentClass, ModuleClass);

            const metadataValue: ComponentMetadata = Reflect.getMetadata(
                DI_METADATA_COMPONENT_SYMBOL,
                ComponentClass,
            );

            /**
             * create a component instance, but not real component yet
             */
            const componentInstance = new ComponentInstance({
                ...metadataValue,
                Class: ComponentClass,
            });

            this.componentInstanceMap.set(ComponentClass, componentInstance);
        }

        /**
         * get imported modules from current module instance and create component instances
         * from them recursively
         */
        for (const importedModuleInstance of Array.from(moduleInstance.getImportedModuleInstances())) {
            this.createComponentInstances(importedModuleInstance);
        }
    }

    private async generateComponentForInstances() {
        for (const [, componentInstance] of Array.from(this.componentInstanceMap.entries()).reverse()) {
            let component = componentInstance.getComponent();

            if (!component) {
                if (typeof componentInstance.metadata.factory === 'function') {
                    component = componentInstance.metadata.factory();
                }
                if (!componentInstance.metadata.lazy) {
                    component = await component.then((result) => result.default || result);
                }
                if (isPromise(component)) {
                    component = await component.then((res: any) => res.default || res);
                }
                componentInstance.setComponent(component);
                if (typeof this.platform.generateComponent === 'function') {
                    await this.platform.generateComponent(componentInstance, component);
                }
            }

            const dependencyMap = this.generateDependencyMap(componentInstance);
            const interceptorClasses: Type[] = Reflect.getMetadata(
                DI_METADATA_USE_INTERCEPTORS_SYMBOL,
                componentInstance.metadata.Class,
            ) || [];
            const interceptorInstances: Interceptor[] = interceptorClasses.map((InterceptorClass) => {
                return dependencyMap.get(InterceptorClass);
            }).filter((instance) => !!instance && typeof instance.intercept === 'function');

            componentInstance.metadata.interceptorInstances = interceptorInstances;
        }
    }

    private async getModuleClassExceptDynamicModule(asyncModuleClass: Promise<Type<any>> | Type<any>): Promise<Type<any>> {
        if (isPromise(asyncModuleClass)) {
            return await asyncModuleClass;
        }

        return asyncModuleClass as Type<any>;
    }

    private async createAllBasicProviderInstances() {
        for (const moduleInstance of Array.from(this.moduleInstanceMap.values()).concat(Array.from(this.globalModuleInstances))) {
            const providers = Array.from(moduleInstance.getProviders());
            for (const provider of providers) {
                if (!isBasicProvider(provider) || (provider as BaseProviderWithValue).value !== undefined) {
                    continue;
                }
                await this.createBaseProviderInstance(moduleInstance.metadata.Class, provider as BaseProviderWithValue);
            }
        }
    }

    private async createBaseProviderInstance(HostModuleClass: Type, provider: BaseProvider) {
        const providerKey = (provider as BaseProvider).provide;
        const ModuleClass = Reflect.getMetadata(PROVIDER_MODULE, provider) as Type;
        const hostModuleInstance = this.moduleInstanceMap.get(HostModuleClass);
        let moduleInstance: ModuleInstance;

        if (hostModuleInstance) {
            moduleInstance = Array
                .from(hostModuleInstance.getImportedModuleInstances())
                .find((moduleInstance) => moduleInstance.metadata.Class === ModuleClass);
        }

        if (!moduleInstance) {
            moduleInstance = this.moduleInstanceMap.get(ModuleClass);;
        }

        if (!moduleInstance) {
            return {
                ...(provider as BaseProvider),
                value: undefined,
            } as BaseProviderWithValue;
        }

        const baseProviderValue = await moduleInstance.generateBaseProviderValue(
            provider as BaseProvider,
            this.createProviderInstance.bind(this),
        );
        const baseProviderWithValue: BaseProviderWithValue = {
            ...(provider as BaseProvider),
            value: baseProviderValue,
        };

        Reflect.defineMetadata(PROVIDER_MODULE, ModuleClass, baseProviderWithValue);
        moduleInstance.setBaseProviderWithValue(providerKey, baseProviderWithValue);

        return baseProviderWithValue;
    }

    private async initializeSelfDeclaredDepsForProviders() {
        for (const [ProviderClass, providerInstance] of this.providerInstanceMap) {
            if (isBasicProvider(ProviderClass) || !providerInstance) {
                continue;
            }

            const ModuleClass = this.providerClassToModuleClassMap.get(ProviderClass);
            const moduleInstance = this.moduleInstanceMap.get(ModuleClass);
            const selfDeclaredDeps: SelfDeclaredDep[] = Reflect.getMetadata(SELF_DECLARED_DEPS_METADATA, ProviderClass) || [];
            const selfDeclaredDepInstances: Array<SelfDeclaredDep & { value: any }> = await Promise.all(selfDeclaredDeps.map((selfDeclaredDep) => {
                if (!moduleInstance.hasDependedProviderClass(selfDeclaredDep.key)) {
                    return undefined;
                }

                const baseProvider = moduleInstance.getBaseProvider(selfDeclaredDep.key);

                if (!baseProvider) {
                    return undefined;
                }

                return this.createProviderInstance(baseProvider).then((baseProviderWithValue: BaseProviderWithValue) => {
                    return {
                        ...selfDeclaredDep,
                        value: baseProviderWithValue.value,
                    } as SelfDeclaredDep & { value: any };
                });
            }));

            for (const selfDeclaredDepInstance of selfDeclaredDepInstances) {
                const {
                    key: propertyKey,
                    value,
                } = selfDeclaredDepInstance;
                Object.defineProperty(providerInstance, propertyKey, {
                    value,
                });
            }
        }
    }

    private processDynamicModule(HostModuleClass: Type, moduleClassOrDynamicModule: AsyncModuleClass): Type | Promise<Type> {
        if (isDynamicModule(moduleClassOrDynamicModule)) {
            const dynamicModule = moduleClassOrDynamicModule as DynamicModule;
            const {
                module: DynamicModuleClass,
                imports = [],
                providers = [],
                exports: exportedProviders = [],
                components = [],
                global = false,
            } = dynamicModule;
            let metadata = Reflect.getMetadata(DI_METADATA_MODULE_SYMBOL, DynamicModuleClass) as ImmutableMap<Type, ModuleMetadata>;

            if (!metadata) {
                metadata = ImmutableMap();
            }

            metadata = metadata.set(HostModuleClass, {
                imports: new Set(imports),
                providers: new Set(providers),
                components: new Set(components),
                exports: new Set(exportedProviders),
            });

            Reflect.defineMetadata(
                DI_METADATA_MODULE_SYMBOL,
                metadata,
                DynamicModuleClass,
            );
            Reflect.defineMetadata(IS_DYNAMIC_MODULE, true, DynamicModuleClass);

            if (global) {
                Reflect.defineMetadata(DI_GLOBAL_MODULE_SYMBOL, true, DynamicModuleClass);
            }

            return DynamicModuleClass as Type<any>;
        }
        return moduleClassOrDynamicModule as Type<any> | Promise<Type<any>>;
    }
}
