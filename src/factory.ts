import 'reflect-metadata';
import {
    AbstractComponent,
    ModuleInstance,
} from './classes';
import {
    DI_DEPS_SYMBOL,
    DI_GLOBAL_MODULE_SYMBOL,
    DI_IMPORTS_SYMBOL,
    DI_PROVIDERS_SYMBOL,
    DI_VIEWS_SYMBOL,
} from './constants';
import {
    AsyncModule,
    RouteConfig,
    RouteConfigItem,
    Type,
    ViewItem,
    ViewMetadata,
} from './types';
import isPromise from 'is-promise';

export class Factory {
    private routeViews: Set<ViewItem> = new Set();
    private nestedRoute: RouteConfigItem[] = [];
    private moduleInstanceMap = new Map<Type<any>, ModuleInstance>();
    private providerInstanceMap = new Map<Type<any>, any>();
    private providerClassToModuleClassMap = new Map<Type, Type>();

    public async create<T = any>(ModuleClass: Type<T> | AsyncModule<T>): Promise<RouteConfig> {
        const rootModuleInstance = await this.createModuleInstance(ModuleClass);
        this.setImportedModuleInstances();
        this.createProviderClassToModuleClassMap();
        await this.createProviderInstances(rootModuleInstance);
        await this.createViews(rootModuleInstance);
        const nestedRoute = this.createNestedRoute();
        return nestedRoute;
    }

    private async createModuleInstance<T>(ModuleClassOrPromise: Type<T> | AsyncModule<T>) {
        const ModuleClass = await this.getAsyncExport((ModuleClassOrPromise as any));

        if (!this.moduleInstanceMap.get(ModuleClass)) {
            const importsArray: Array<Type | Promise<Type>> = Reflect.getMetadata(
                DI_IMPORTS_SYMBOL,
                ModuleClass,
            ) || [];
            const providersArray: Array<any> = Reflect.getMetadata(DI_PROVIDERS_SYMBOL, ModuleClass) || [];
            const viewsArray: Array<Type<AbstractComponent> | Promise<Type<AbstractComponent>>> = Reflect.getMetadata(
                DI_VIEWS_SYMBOL,
                ModuleClass,
            ) || [];
            const isGlobal: boolean = Reflect.getMetadata(DI_GLOBAL_MODULE_SYMBOL, ModuleClass) || false;

            const imports = new Set<Type>();
            const views = new Set<Type<AbstractComponent>>();

            for (const ImportedModuleClassOrPromise of importsArray) {
                const ImportedModuleClass = await this.getAsyncExport(ImportedModuleClassOrPromise);
                imports.add(ImportedModuleClass);
            }

            for (const ViewClassOrPromise of viewsArray) {
                const ViewClass = await this.getAsyncExport(ViewClassOrPromise);
                views.add(ViewClass);
            }

            const moduleInstance = new ModuleInstance({
                Class: ModuleClass,
                imports,
                providers: new Set(providersArray),
                isGlobal,
                views,
            });

            this.moduleInstanceMap.set(ModuleClass, moduleInstance);
        }

        const currentModuleInstance = this.moduleInstanceMap.get(ModuleClass);

        for (const ImportedModuleClassOrPromise of currentModuleInstance.metadata.imports) {
            await this.createModuleInstance(ImportedModuleClassOrPromise);
        }

        return currentModuleInstance;
    }

    private setImportedModuleInstances() {
        for (const [ModuleClass, moduleInstance] of this.moduleInstanceMap.entries()) {
            for (const ImportedModuleClass of Array.from(moduleInstance.metadata.imports)) {
                if (ModuleClass === ImportedModuleClass) {
                    throw new Error(`Module ${ModuleClass.name} cannot import itself`);
                }

                const importedModuleInstance = this.moduleInstanceMap.get(ImportedModuleClass);

                if (!importedModuleInstance) {
                    throw new Error(`Module ${ImportedModuleClass.name} is not imported into ${ModuleClass.name}`);
                }

                moduleInstance.addImportedModuleInstance(importedModuleInstance);
            }

            if (moduleInstance.metadata.isGlobal) {
                for (const [TargetModuleClass, targetModuleInstance] of this.moduleInstanceMap.entries()) {
                    if (TargetModuleClass !== ModuleClass) {
                        targetModuleInstance.addImportedModuleInstance(moduleInstance);
                    }
                }
            }
        }
    }

    private createProviderClassToModuleClassMap() {
        for (const [, moduleInstance] of this.moduleInstanceMap) {
            for (const ProviderClass of moduleInstance.metadata.providers) {
                this.providerClassToModuleClassMap.set(ProviderClass, moduleInstance.metadata.Class);
            }
        }
    }

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

        this.providerInstanceMap.set(
            ProviderClass,
            new ProviderClass(
                ...await Promise.all(dependedProviderClasses.map((DependedProviderClass) => {
                    if (DependedProviderClass === ProviderClass) {
                        throw new Error(`Provider ${ProviderClass.name} cannot depend on itself`);
                    }

                    const DependedModuleClass = this.providerClassToModuleClassMap.get(DependedProviderClass);

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

    private async createProviderInstances(moduleInstance: ModuleInstance) {
        for (const ProviderClass of Array.from(moduleInstance.metadata.providers)) {
            await this.createProviderInstance(ProviderClass);
        }

        for (const importedModuleInstance of Array.from(moduleInstance.getImportedModuleInstances())) {
            await this.createProviderInstances(importedModuleInstance);
        }
    }

    private async getAsyncExport<T>(objectOrPromise: T | Promise<T>): Promise<T> {
        if (isPromise(objectOrPromise)) {
            const importedObject: any = await objectOrPromise;

            if (typeof importedObject !== 'object') {
                return null;
            }

            const [moduleKey] = Object.keys(importedObject);

            if (!moduleKey) {
                return null;
            }

            return importedObject[moduleKey];
        }

        return objectOrPromise;
    }

    private async createViews(moduleInstance: ModuleInstance) {
        for (const ViewClass of Array.from(moduleInstance.metadata.views)) {
            const metadataValue: ViewMetadata = Reflect.getMetadata(DI_VIEWS_SYMBOL, ViewClass);
            const { dependencies: dependedProviderClasses } = metadataValue;

            const viewInstance = new ViewClass(...dependedProviderClasses.map((DependedProviderClass) => {
                const DependedModuleClass = this.providerClassToModuleClassMap.get(DependedProviderClass);

                if (!moduleInstance.hasDependedProviderClass(DependedProviderClass)) {
                    throw new Error(
                        `Cannot inject provider ${DependedProviderClass.name} into view ${ViewClass.name}, did you import ${DependedModuleClass.name}?`,
                    );
                }

                const providerInstance = this.providerInstanceMap.get(DependedProviderClass);

                if (!providerInstance) {
                    throw new Error(
                        `Cannot find provider instance for ${DependedProviderClass.name}`,
                    );
                }

                return providerInstance;
            }));

            this.routeViews.add({
                Class: ViewClass,
                instance: viewInstance,
                options: metadataValue.options,
            });
        }

        for (const importedModuleInstance of Array.from(moduleInstance.getImportedModuleInstances())) {
            await this.createViews(importedModuleInstance);
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

    private createNestedRoute(): RouteConfig {
        const routeViews = Array.from(this.routeViews);

        while (routeViews.length > 0) {
            const currentRouteView = routeViews.shift();

            if (!currentRouteView?.options?.parent) {
                this.nestedRoute.push(this.createRouteConfigItem(currentRouteView));
            } else {
                const result = this.setToParentRouteView(
                    this.nestedRoute,
                    this.createRouteConfigItem(currentRouteView),
                    currentRouteView.options.parent,
                );

                if (!result) {
                    routeViews.push(currentRouteView);
                }
            }
        }

        return Array.from(this.nestedRoute);
    }

    private createRouteConfigItem(routeView: ViewItem): RouteConfigItem {
        const {
            options,
            Class,
        } = routeView;

        const {
            name,
            elementProps,
            path: pathname,
            parent: ParentViewComponent,
        } = options;

        const result: RouteConfigItem = {
            name,
            ViewClass: Class,
            component: null,
            path: this.normalizePath(pathname, !ParentViewComponent),
            ...(
                typeof elementProps === 'undefined'
                    ? {}
                    : { elementProps }
            ),
        };

        if (routeView?.instance && typeof routeView.instance.getComponent === 'function') {
            result.component = routeView.instance.getComponent();
        }

        return result;
    }

    private setToParentRouteView(
        routes: RouteConfigItem[],
        routeConfigItem: RouteConfigItem,
        ParentViewComponent: Type<AbstractComponent>,
    ): boolean {
        for (const currentRouteConfigItem of routes) {
            const {
                ViewClass,
            } = currentRouteConfigItem;

            if (ViewClass === ParentViewComponent) {
                if (!Array.isArray(currentRouteConfigItem.children)) {
                    currentRouteConfigItem.children = [];
                }

                currentRouteConfigItem.children.push(routeConfigItem);

                return true;
            } else {
                if (Array.isArray(currentRouteConfigItem.children)) {
                    return this.setToParentRouteView(
                        currentRouteConfigItem.children,
                        routeConfigItem,
                        ParentViewComponent,
                    );
                }
            }
        }

        return false;
    }
}
