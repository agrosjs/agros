import 'reflect-metadata';
import React from 'react';
import {
    AbstractComponent,
    ModuleInstance,
} from './classes';
import {
    DI_DEPS_SYMBOL,
    DI_GLOBAL_MODULE_SYMBOL,
    DI_METADATA_MODULE_SYMBOL,
    DI_METADATA_VIEW_SYMBOL,
} from './constants';
import {
    AsyncModule,
    ModuleMetadata,
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
        await this.createNestedRoute();
        this.nestedRoute = this.normalizeNestedRoute(Array.from(this.nestedRoute));
        this.nestedRoute = this.sequenceNestedRoute(Array.from(this.nestedRoute));
        return Array.from(this.nestedRoute);
    }

    private async createModuleInstance<T>(ModuleClassOrPromise: Type<T> | AsyncModule<T>) {
        const ModuleClass: Type = await this.getAsyncExport((ModuleClassOrPromise as any));

        if (!this.moduleInstanceMap.get(ModuleClass)) {
            const metadataValue: ModuleMetadata = Reflect.getMetadata(
                DI_METADATA_MODULE_SYMBOL,
                ModuleClass,
            );
            const isGlobal: boolean = Reflect.getMetadata(DI_GLOBAL_MODULE_SYMBOL, ModuleClass) || false;

            const {
                imports,
                providers,
                views: viewOrPromiseSet,
                exports: exportedProviders,
            } = metadataValue;

            for (const ExportedProviderClass of exportedProviders) {
                if (!exportedProviders.has(ExportedProviderClass)) {
                    throw new Error(`Provider ${ExportedProviderClass.name} cannot be exported by ${ModuleClass.name}`);
                }
            }

            const moduleInstance = new ModuleInstance({
                Class: ModuleClass,
                isGlobal,
                imports: new Set(imports),
                providers: new Set(providers),
                exports: new Set(exportedProviders),
                views: new Set(viewOrPromiseSet),
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
        for (const ViewClassOrConfig of Array.from(moduleInstance.metadata.views)) {
            let data = {
                component: null,
                options: null,
                lazyLoad: false,
            } as ViewItem;

            if (typeof ViewClassOrConfig === 'object') {
                const {
                    view: viewPromise,
                    ...options
                } = ViewClassOrConfig;

                data.lazyLoad = true;
                data.options = options;

                data.component = React.lazy(() => new Promise((resolve) => {
                    this.getAsyncExport(viewPromise).then((ViewClass) => {
                        const instance = this.createViewInstance(ViewClass, moduleInstance);
                        if (typeof instance.getComponent === 'function') {
                            instance.getComponent().then((component) => {
                                resolve({ default: component } as any);
                            });
                        }
                    });
                }));
            } else {
                const ViewClass = ViewClassOrConfig as Type<AbstractComponent>;
                const instance = this.createViewInstance(ViewClass, moduleInstance);

                const metadataValue: ViewMetadata = Reflect.getMetadata(
                    DI_METADATA_VIEW_SYMBOL,
                    ViewClass,
                );

                data.options = metadataValue.options || {};

                if (typeof instance.getComponent === 'function') {
                    data.component = await instance.getComponent();
                }
            }

            this.routeViews.add(data);
        }

        for (const importedModuleInstance of Array.from(moduleInstance.getImportedModuleInstances())) {
            await this.createViews(importedModuleInstance);
        }
    }

    private createViewInstance(ViewClass: Type<AbstractComponent>, moduleInstance: ModuleInstance) {
        const metadataValue: ViewMetadata = Reflect.getMetadata(
            DI_METADATA_VIEW_SYMBOL,
            ViewClass,
        );

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

        return viewInstance;
    }

    private normalizePath(path: string, topLeveled = false) {
        let newPath: string = path;

        newPath = newPath.replace(/^.+\/+$/g, '');

        if (!topLeveled) {
            newPath = newPath.replace(/^\/+/g, '');
        }

        return newPath;
    }

    private async createNestedRoute() {
        const routeViews = Array.from(this.routeViews);

        while (routeViews.length > 0) {
            const currentRouteView = routeViews.shift();

            const {
                options = {},
            } = currentRouteView;

            const { path: pathname } = options;

            if (!pathname) {
                throw new Error('View should have `path` value');
            }

            const routeConfigItem = this.createRouteConfigItem(currentRouteView);

            const isTopLeveledRouteView = pathname.startsWith('/')
                ? pathname.split('/').length === 2
                : pathname.split('/').length === 1;

            if (isTopLeveledRouteView) {
                this.nestedRoute.push(routeConfigItem);
            } else {
                const result = this.setToParentRouteView(
                    this.nestedRoute,
                    routeConfigItem,
                );

                if (
                    !result &&
                    Array.from(this.routeViews).some((routeView) => {
                        return routeView.options?.path === pathname
                            .split('/')
                            .slice(0, -1)
                            .join('/');
                    })
                ) {
                    routeViews.push(currentRouteView);
                } else {
                    this.nestedRoute.push(routeConfigItem);
                }
            }
        }
    }

    private sequenceNestedRoute(nestedRoutes: RouteConfig) {
        const newNestedRoutes = nestedRoutes.sort((a, b) => {
            return (b.priority || 0) * (b.sequence || 1) - (a.priority || 0) * (a.sequence || 1);
        });

        for (const nestedRouteItem of newNestedRoutes) {
            if (Array.isArray(nestedRouteItem.children) && nestedRouteItem.children.length > 0) {
                nestedRouteItem.children = this.sequenceNestedRoute(nestedRouteItem.children);
            }
        }

        return newNestedRoutes;
    }

    private createRouteConfigItem(routeView: ViewItem): RouteConfigItem {
        const {
            options,
            component,
            lazyLoad = false,
        } = routeView;

        const {
            elementProps,
            path: pathname,
            priority = 0,
        } = options;

        const result: RouteConfigItem = {
            component,
            priority,
            path: pathname,
            lazyLoad,
            ...(
                typeof elementProps === 'undefined'
                    ? {}
                    : { elementProps }
            ),
        };

        return result;
    }

    private setToParentRouteView(
        routes: RouteConfigItem[],
        routeConfigItem: RouteConfigItem,
    ): boolean {
        const { path: currentRoutePathname } = routeConfigItem;

        for (const currentRouteConfigItem of routes) {
            const {
                path: parentRoutePathname,
            } = currentRouteConfigItem;

            const parentPathnameSegments = parentRoutePathname.split('/');
            const currentPathnameSegments = currentRoutePathname.split('/');

            if (parentPathnameSegments.every((segment, index) => segment === currentPathnameSegments[index])) {
                if (parentPathnameSegments.length + 1 === currentPathnameSegments.length) {
                    if (!Array.isArray(currentRouteConfigItem.children)) {
                        currentRouteConfigItem.children = [];
                    }

                    routeConfigItem.sequence = currentRouteConfigItem.children.length + 1;

                    currentRouteConfigItem.children.push(routeConfigItem);

                    return true;
                } else {
                    if (Array.isArray(currentRouteConfigItem.children)) {
                        return this.setToParentRouteView(currentRouteConfigItem.children, routeConfigItem);
                    }
                }
            }
        }

        return false;
    }

    private normalizeNestedRoute(nestedRoutes: RouteConfig, parentPathname = '', level = 0) {
        return nestedRoutes.map((routeConfigItem) => {
            const {
                path: pathname,
            } = routeConfigItem;

            const result = {
                ...routeConfigItem,
                path: this.normalizePath(pathname.slice(parentPathname.length), level === 0),
            } as RouteConfigItem;

            if (Array.isArray(result.children) && result.children.length > 0) {
                result.children = this.normalizeNestedRoute(
                    result.children,
                    pathname,
                    level + 1,
                );
            }

            return result;
        });
    }
}
