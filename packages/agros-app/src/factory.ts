import 'reflect-metadata';
import { Map as ImmutableMap } from 'immutable';
import {
    ModuleMetadata,
    Type,
    ComponentMetadata,
    Factory as IFactory,
    Interceptor,
    AsyncModuleClass,
    ValueProvider,
} from '@agros/common/lib/types';
import isPromise from 'is-promise';
import {
    DI_DEPS_SYMBOL,
    DI_GLOBAL_MODULE_SYMBOL,
    DI_METADATA_COMPONENT_SYMBOL,
    DI_METADATA_MODULE_SYMBOL,
    DI_METADATA_USE_INTERCEPTORS_SYMBOL,
} from '@agros/common/lib/constants';
import { ComponentInstance } from '@agros/common/lib/component-instance.class';
import { ModuleInstance } from '@agros/common/lib/module-instance.class';
import { Platform } from '@agros/platforms/lib/platform.interface';

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
    private providerClassToModuleClassMap = new Map<Type, Type>();
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
        const rootModuleInstance = await this.createModuleInstance(ModuleClass);

        const rootModuleExportedComponentClasses = Array.from(rootModuleInstance.metadata?.exports || new Set<Type>()).filter((ExportedClass) => {
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
        this.createComponentInstances(rootModuleInstance);
        await this.generateComponentForInstances();
        this.rootModuleInstance = rootModuleInstance;

        for (const [, moduleInstance] of this.moduleInstanceMap.entries()) {
            await moduleInstance.generateProviderValues(this);
        }

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
    private async createModuleInstance<T>(ModuleClassOrPromise: AsyncModuleClass<T>) {
        const ModuleClassOrValueProvider = await this.getModuleClass(ModuleClassOrPromise);

        if ((ModuleClassOrValueProvider as ValueProvider).provide) {
            return;
        }

        const ModuleClass = ModuleClassOrValueProvider as Type;

        if (!this.moduleInstanceMap.get(ModuleClass)) {
            const metadataValue: ModuleMetadata = Reflect.getMetadata(
                DI_METADATA_MODULE_SYMBOL,
                ModuleClass,
            );
            const isGlobal: boolean = Reflect.getMetadata(DI_GLOBAL_MODULE_SYMBOL, ModuleClass) || false;

            const {
                imports,
                providers,
                routes,
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
                    imports: new Set(imports),
                    providers: new Set(providers),
                    exports: new Set(exportedProviders),
                    routes: new Set(routes),
                    components: new Set(components),
                },
                this.globalModuleInstances,
            );

            this.moduleInstanceMap.set(ModuleClass, moduleInstance);
        }

        const currentModuleInstance = this.moduleInstanceMap.get(ModuleClass);

        /**
         * get all imported module classes and create them recursively
         */
        for (const ImportedModuleClassOrPromise of currentModuleInstance.metadata.imports) {
            if (
                typeof (ImportedModuleClassOrPromise as ValueProvider).provide === 'string' &&
                typeof (ImportedModuleClassOrPromise as ValueProvider).useValue === 'function'
            ) {
                const {
                    provide,
                    useValue,
                } = ImportedModuleClassOrPromise as ValueProvider;
                currentModuleInstance.setValueProviderItem(provide, useValue);
            } else {
                await this.createModuleInstance(ImportedModuleClassOrPromise);
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
                const ImportedModuleClass = await this.getModuleClass(ImportedModuleClassOrPromise) as Type;

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
            for (const ProviderClass of moduleInstance.metadata.providers) {
                this.providerClassToModuleClassMap.set(ProviderClass, moduleInstance.metadata.Class);
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
    private async createProviderInstance(ProviderClass: Type) {
        if (this.providerInstanceMap.get(ProviderClass)) {
            return this.providerInstanceMap.get(ProviderClass);
        }

        const ModuleClass = this.providerClassToModuleClassMap.get(ProviderClass);
        const moduleInstance = this.moduleInstanceMap.get(ModuleClass);

        const dependedProviderClasses = Reflect.getMetadata(DI_DEPS_SYMBOL, ProviderClass) as Type[];

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
                ...await Promise.all(dependedProviderClasses.map((DependedProviderClass) => {
                    if (DependedProviderClass === ProviderClass) {
                        throw new Error(`Provider ${ProviderClass.name} cannot depend on itself`);
                    }

                    /**
                     * get the module class that the provider depended on
                     */
                    const DependedModuleClass = this.providerClassToModuleClassMap.get(DependedProviderClass);

                    if (!DependedModuleClass) {
                        throw new Error(`Cannot find the module that provides ${DependedProviderClass.name}, please make sure it is exported by a module`);
                    }

                    /**
                     * check depended provider class be exported from the module,
                     * if not, it will throw an error
                     */
                    if (!moduleInstance.hasDependedProviderClass(DependedProviderClass)) {
                        throw new Error(
                            `Cannot inject provider ${DependedProviderClass.name} into provider ${ProviderClass.name}, did you import ${DependedModuleClass.name}?`,
                        );
                    }

                    return this.createProviderInstance(DependedProviderClass);
                })),
            ),
        );

        return this.providerInstanceMap.get(ProviderClass);
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

    private async getModuleClass(asyncModuleClass: AsyncModuleClass): Promise<Type<any> | ValueProvider> {
        if (isPromise(asyncModuleClass)) {
            return await asyncModuleClass;
        }

        return asyncModuleClass;
    }
}
