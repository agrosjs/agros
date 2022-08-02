import 'reflect-metadata';
import isPromise from 'is-promise';
import { Map as ImmutableMap } from 'immutable';
import {
    AsyncModuleClass,
    ModuleMetadata,
    RouteOptionItem,
    Type,
    ComponentMetadata,
    RouterItem,
    Factory as IFactory,
    DI_DEPS_SYMBOL,
    DI_GLOBAL_MODULE_SYMBOL,
    DI_METADATA_COMPONENT_SYMBOL,
    DI_METADATA_MODULE_SYMBOL,
    DI_METADATA_USE_INTERCEPTORS_SYMBOL,
} from '@agros/common';
import { ComponentInstance } from '@agros/common/lib/component-instance.class';
import { ModuleInstance } from '@agros/common/lib/module-instance.class';
import { ProjectConfigParser } from '@agros/config';
import { AbstractPlatform } from '@agros/platforms';
import { loadPlatform } from '@agros/utils/lib/platform-loader';

export class Factory implements IFactory {
    protected platform: AbstractPlatform;
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
     * nested router items which would export from `create` method
     */
    private routerItems: RouterItem[] = [];
    /**
     * @private
     * global module instances
     */
    private globalModuleInstances = new Set<ModuleInstance>();

    public constructor(protected readonly projectConfigParser: ProjectConfigParser) {
        this.platform = loadPlatform(this.projectConfigParser.getConfig<string>('platform'));
    }

    /**
     * @public
     * @async
     * @method
     * @param {Type<T>} ModuleClass
     * @returns {Promise<RouteConfig>}
     *
     * create a route config with the root module
     */
    public async create<T = any>(ModuleClass: Type<T>): Promise<RouterItem[]> {
        const rootModuleInstance = await this.createModuleInstance(ModuleClass);
        await this.setImportedModuleInstances();
        this.createProviderClassToModuleClassMap();
        await this.createProviderInstances(rootModuleInstance);
        this.createComponentInstances(rootModuleInstance);
        this.generateComponentForInstances();
        this.routerItems = await this.createRouterItems(Array.from(rootModuleInstance.metadata.routes));
        return Array.from(this.routerItems);
    }

    /**
     * generate dependency map that can be used by `declarations.get` method
     *
     * @returns {Map<ClassType, any>} a map for storing relationships between provider class
     * and provider instance, when the provider class infers to a component class, its value
     * would be a component
     */
    public generateDependencyMap(componentInstance: ComponentInstance) {
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
                 * if current depended component class is not initialized, then create
                 * the component recursively
                 */
                if (!dependedComponent) {
                    dependedComponent = this.platform.generateComponent(dependedComponentInstance, this);
                }

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
    };

    /**
     * @param {AsyncModuleClass} ModuleClassOrPromise
     * @returns {Promise<void>}
     *
     * create flattened module instances using a root module class
     * this is a recursive function
     */
    private async createModuleInstance<T>(ModuleClassOrPromise: AsyncModuleClass<T>) {
        const ModuleClass = await this.getModuleClass(ModuleClassOrPromise);

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
            await this.createModuleInstance(ImportedModuleClassOrPromise);
        }

        return currentModuleInstance;
    }

    /**
     * @private
     * @async
     * @returns {Promise<void>}
     *
     * add imported module instances into every instance
     */
    private async setImportedModuleInstances() {
        for (const [ModuleClass, moduleInstance] of this.moduleInstanceMap.entries()) {
            for (const ImportedModuleClassOrPromise of Array.from(moduleInstance.metadata.imports)) {
                const ImportedModuleClass = await this.getModuleClass(ImportedModuleClassOrPromise);

                if (ModuleClass === ImportedModuleClass) {
                    throw new Error(`Module ${ModuleClass.name} cannot import itself`);
                }

                const importedModuleInstance = this.moduleInstanceMap.get(ImportedModuleClass);

                if (!importedModuleInstance) {
                    throw new Error(`Module ${ImportedModuleClass.name} cannot be imported into ${ModuleClass.name}`);
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
     * @private
     * @async
     * @returns {void}
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
     * @private
     * @async
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

    private generateComponentForInstances() {
        for (const [, componentInstance] of this.componentInstanceMap.entries()) {
            this.platform.generateComponent(componentInstance, this);
        }
    }

    private normalizePath(path: string, topLeveled = false) {
        let newPath: string = path;

        newPath = newPath.replace(/^.+\/+$/g, '');

        if (!topLeveled) {
            newPath = newPath.replace(/^\/+/g, '');
        }

        return newPath;
    }

    /**
     * @private
     * @param {RouteOptionItem[]} routes route config items from modules
     * @param {string} prefixPathname prefix pathname of current level routes
     */
    private async createRouterItems(routes: RouteOptionItem[], prefixPathname = ''): Promise<RouterItem[]> {
        let result: RouterItem[] = [];

        for (const routeItem of Array.from(routes)) {
            const {
                useComponentClass,
                useModuleClass,
                children,
                path: pathname = '',
                ...options
            } = routeItem;

            let currentPathname = '';

            if (!this.normalizePath(prefixPathname)) {
                currentPathname = this.normalizePath(pathname);
            } else if (!this.normalizePath(pathname)) {
                currentPathname = this.normalizePath(prefixPathname);
            } else {
                currentPathname = `${this.normalizePath(prefixPathname)}/${this.normalizePath(pathname)}`;
            }

            if (useComponentClass && useModuleClass) {
                throw new Error('\'useComponentClass\' and \'useModuleClass\' are not permitted to be specified at one time');
            }

            if (useComponentClass) {
                const ComponentClass = useComponentClass;
                const currentRouterItem = {
                    ...options,
                    path: currentPathname,
                    componentInstance: this.componentInstanceMap.get(ComponentClass),
                } as RouterItem;

                if (Array.isArray(children)) {
                    currentRouterItem.children = await this.createRouterItems(routeItem.children);
                }

                result = result.concat(currentRouterItem);
            } else if (useModuleClass) {
                /**
                 * if `useModuleClass` is specified, then flatten it to current level child routes
                 */
                const ModuleClass = await this.getModuleClass(useModuleClass);
                const moduleInstance = this.moduleInstanceMap.get(ModuleClass);
                const currentRouteOptionItems = Array.from(moduleInstance.metadata.routes);
                const currentRouterItems = await this.createRouterItems(
                    currentRouteOptionItems,
                    this.normalizePath(pathname) || '',
                );

                for (const currentRouterItem of currentRouterItems) {
                    if (Array.isArray(routeItem.children)) {
                        currentRouterItem.children = await this.createRouterItems(currentRouterItem.children);
                    }
                }

                result = result.concat(currentRouterItems);
            } else {
                throw new Error('\'useComponentClass\' or \'useModuleClass\' should be specified');
            }
        }

        return result;
    }

    private async getModuleClass(asyncModuleClass: AsyncModuleClass): Promise<Type<any>> {
        if (isPromise(asyncModuleClass)) {
            return await asyncModuleClass;
        }

        return asyncModuleClass;
    }
}
