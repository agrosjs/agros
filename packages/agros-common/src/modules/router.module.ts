import {
    RouterItem,
    RouteOptionItem,
    Type,
    AsyncModuleClass,
    Factory,
    DynamicModule,
    isBasicProvider,
} from '@agros/tools';
import { ROUTES } from '../constants';
import isPromise from 'is-promise';

export interface RouterModuleOptions {
    routes: RouteOptionItem[];
}

export interface RouterModuleAsyncOptions {
    imports: Array<AsyncModuleClass>;
    inject: Array<Type>;
    useFactory: (...args: any[]) => Promise<RouteOptionItem[]>;
}

export class RouterModule {
    public static register({
        routes = [],
    }: RouterModuleOptions): DynamicModule {
        return {
            module: RouterModule,
            global: false,
            providers: [
                {
                    provide: ROUTES,
                    useValue: routes,
                },
            ],
        };
    }

    public static registerAsync({
        imports = [],
        inject = [],
        useFactory = async () => ([]),
    }: RouterModuleAsyncOptions): DynamicModule {
        return {
            module: RouterModule,
            global: false,
            imports,
            providers: [
                {
                    inject,
                    provide: ROUTES,
                    useFactory,
                },
            ],
        };
    }

    public static async createRouterItems(
        context: Factory,
        routes: RouteOptionItem[] = [],
        prefixPathname = '',
    ) {
        const normalizePath = (path: string, topLeveled = false) => {
            let newPath: string = path;

            newPath = newPath.replace(/^.+\/+$/g, '');

            if (!topLeveled) {
                newPath = newPath.replace(/^\/+/g, '');
            }

            return newPath;
        };

        const getModuleClass = async (asyncModuleClass: AsyncModuleClass): Promise<Type<any>> => {
            if (isPromise(asyncModuleClass)) {
                return await asyncModuleClass;
            }

            if (!isBasicProvider(asyncModuleClass)) {
                return asyncModuleClass as Type;
            }

            return null;
        };

        const moduleInstanceMap = context.getModuleInstanceMap();
        const componentInstanceMap = context.getComponentInstanceMap();
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
                    currentRouterItem.children = await RouterModule.createRouterItems(
                        context,
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
                let currentRouteOptionItems: RouteOptionItem[] = moduleInstance.getBaseProvider(ROUTES)?.value || [];
                const currentRouterItems = await RouterModule.createRouterItems(
                    context,
                    currentRouteOptionItems,
                    normalizePath(pathname) || '',
                );

                for (const currentRouterItem of currentRouterItems) {
                    if (Array.isArray(routeItem.children)) {
                        currentRouterItem.children = await RouterModule.createRouterItems(
                            context,
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
    }
}
