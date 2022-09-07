import { ComponentInstance } from '@agros/common/lib/component-instance.class';
import { ModuleInstance } from '@agros/common/lib/module-instance.class';
import {
    RouterItem,
    RouteOptionItem,
    Type,
    AsyncModuleClass,
    ValueProvider,
    Factory,
} from '@agros/common/lib/types';
import {
    ROUTES_ROOT,
    ROUTES_FEATURE,
} from '@agros/common/lib/constants';
import isPromise from 'is-promise';

export interface RouterModuleRootOptions {
    routes: RouteOptionItem[];
    prefixPathname?: string;
}

export type RouterModuleFeatureOptions = Omit<RouterModuleRootOptions, 'prefixPathname'>;

export class RouterModule {
    public static forRoot({
        routes = [],
        prefixPathname = '',
    }: RouterModuleRootOptions) {
        const normalizePath = (path: string, topLeveled = false) => {
            let newPath: string = path;

            newPath = newPath.replace(/^.+\/+$/g, '');

            if (!topLeveled) {
                newPath = newPath.replace(/^\/+/g, '');
            }

            return newPath;
        };

        const getModuleClass = async (asyncModuleClass: AsyncModuleClass): Promise<Type<any> | ValueProvider> => {
            if (isPromise(asyncModuleClass)) {
                return await asyncModuleClass;
            }

            return asyncModuleClass;
        };

        const createRouterItems = async (
            componentInstanceMap: Map<Type<any>, ComponentInstance>,
            moduleInstanceMap: Map<Type<any>, ModuleInstance>,
            routes: RouteOptionItem[],
            prefixPathname = '',
        ) => {
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

                if (!normalizePath(prefixPathname)) {
                    currentPathname = normalizePath(pathname);
                } else if (!normalizePath(pathname)) {
                    currentPathname = normalizePath(prefixPathname);
                } else {
                    currentPathname = `${normalizePath(prefixPathname)}/${normalizePath(pathname)}`;
                }

                if (useComponentClass && useModuleClass) {
                    throw new Error('\'useComponentClass\' and \'useModuleClass\' are not permitted to be specified at one time');
                }

                if (useComponentClass) {
                    const ComponentClass = useComponentClass;
                    const currentRouterItem = {
                        ...options,
                        path: currentPathname,
                        componentInstance: componentInstanceMap.get(ComponentClass),
                    } as RouterItem;

                    if (Array.isArray(children)) {
                        currentRouterItem.children = await createRouterItems(
                            componentInstanceMap,
                            moduleInstanceMap,
                            routeItem.children,
                        );
                    }

                    result = result.concat(currentRouterItem);
                } else if (useModuleClass) {
                    /**
                     * if `useModuleClass` is specified, then flatten it to current level child routes
                     */
                    const ModuleClass = (await getModuleClass(useModuleClass)) as Type;
                    const moduleInstance = moduleInstanceMap.get(ModuleClass);
                    const currentRouteOptionItems = Array.from(moduleInstance.metadata.routes);
                    const currentRouterItems = await createRouterItems(
                        componentInstanceMap,
                        moduleInstanceMap,
                        currentRouteOptionItems,
                        normalizePath(pathname) || '',
                    );

                    for (const currentRouterItem of currentRouterItems) {
                        if (Array.isArray(routeItem.children)) {
                            currentRouterItem.children = await createRouterItems(
                                componentInstanceMap,
                                moduleInstanceMap,
                                currentRouterItem.children,
                            );
                        }
                    }

                    result = result.concat(currentRouterItems);
                } else {
                    throw new Error('\'useComponentClass\' or \'useModuleClass\' should be specified');
                }
            }

            return result;
        };

        return {
            provide: ROUTES_ROOT,
            useValue: async (context: Factory) => {
                const moduleInstanceMap = context.getModuleInstanceMap();
                const componentInstanceMap = context.getComponentInstanceMap();
                return await createRouterItems(
                    componentInstanceMap,
                    moduleInstanceMap,
                    routes,
                    prefixPathname,
                );
            },
        };
    }

    public static forFeature({
        routes = [],
    }: RouterModuleFeatureOptions) {
        return {
            provide: ROUTES_FEATURE,
            useValue: async () => {
                return routes;
            },
        };
    }
}
