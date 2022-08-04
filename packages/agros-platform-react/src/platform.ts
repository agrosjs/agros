import 'reflect-metadata';
import {
    Factory,
    FactoryForwardRef,
    Type,
} from '@agros/common/lib/types';
import {
    DEPS_PROPERTY_NAME,
    DI_METADATA_USE_INTERCEPTORS_SYMBOL,
} from '@agros/common/lib/constants';
import { ComponentInstance } from '@agros/common/lib/component-instance.class';
import { Platform } from '@agros/platforms/lib/platform.interface';
import { EnsureImportOptions } from '@agros/utils/lib/ensure-import';
import {
    createElement,
    ExoticComponent,
    FC,
    useState,
} from 'react';
import {
    useLocation,
    useParams,
    useSearchParams,
} from 'react-router-dom';
import { useAsyncEffect } from 'use-async-effect';

const platform: Platform = {
    getDefaultConfig() {
        return {};
    },
    getLoaderImports(): Omit<EnsureImportOptions, 'statements'>[] {
        return [
            {
                libName: '@agros/platform-react/lib/react-router-dom',
                identifierName: 'Routes',
            },
            {
                libName: '@agros/platform-react/lib/react-router-dom',
                identifierName: 'Route',
            },
            {
                libName: '@agros/platform-react/lib/react-router-dom',
                identifierName: 'BrowserRouter',
            },
            {
                libName: '@agros/app/lib/factory',
                identifierName: 'Factory',
            },
            {
                libName: '@agros/platform-react/lib/react',
                identifierName: 'React',
                type: 'default',
            },
            {
                libName: '@agros/platform-react/lib/react-dom',
                identifierName: 'render',
            },
        ];
    },
    getDecoratorImports(): Omit<EnsureImportOptions, 'statements'>[] {
        return [
            {
                libName: '@agros/platform-react/lib/react',
                identifierName: 'React',
                type: 'default',
            },
        ];
    },
    getBootstrapCode(ensuredImportsMap: Record<string, string>): string {
        const reactIdentifier = ensuredImportsMap['React'] || 'React';
        return `
            const useRouteElements = (Module) => {
                const [routerItems, setRouterItems] = ${reactIdentifier}.useState([]);
                const [elements, setElements] = ${reactIdentifier}.useState(null);

                ${reactIdentifier}.useEffect(() => {
                    const RootModule = Module;
                    const factory = new ${ensuredImportsMap['Factory'] || 'Factory'}(${ensuredImportsMap['platform'] || 'platform'});
                    factory.create(RootModule).then((items) => {
                        setRouterItems(items);
                    });
                }, [Module]);

                ${reactIdentifier}.useEffect(() => {
                    const elements = ${ensuredImportsMap['createRoutes'] || 'createRoutes'}(routerItems);
                    setElements(elements);
                }, [routerItems]);

                return elements;
            };

            const RootContainer = ({
                module: Module,
                routerProps = {},
                RouterComponent = ${ensuredImportsMap['BrowserRouter'] || 'BrowserRouter'},
            }: any) => {
                const elements = useRouteElements(Module);

                return ${reactIdentifier}.createElement(
                    RouterComponent,
                    routerProps,
                    ${reactIdentifier}.createElement(${ensuredImportsMap['Routes'] || 'Routes'}, {}, elements),
                );
            };

            const bootstrap = (configList) => {
                if (!Array.isArray(configList)) {
                    return;
                }

                for (const configItem of configList) {
                    const {
                        module: Module,
                        RouterComponent,
                        routerProps,
                        container = document.getElementById('root'),
                    } = configItem;

                    ${ensuredImportsMap['render'] || 'render'}(
                        ${reactIdentifier}.createElement(RootContainer, {
                            module: Module,
                            RouterComponent,
                            routerProps,
                        }),
                        container,
                    );
                }
            };
        `;
    },
    getComponentFactoryCode(map: Record<string, string>, filePath: string, lazy = false) {
        const componentIdentifierName = 'Agros$$CurrentComponent';
        return {
            factoryCode: `forwardRef => ${lazy ? `${map['React'] || 'React'}.lazy(() => forwardRef(import('${filePath}')))` : componentIdentifierName}`,
            importCodeLines: lazy
                ? []
                : [`import ${componentIdentifierName} from '${filePath}';`],
        };
    },
    generateComponent<T = any>(componentInstance: ComponentInstance, context: Factory): T {
        const component = componentInstance.getComponent();

        if (component) {
            return component as T;
        }

        /**
         * set component directly so that it can prevent unlimited creating tasks
         */
        componentInstance.setComponent((props: any) => {
            const dependencyMap = context.generateDependencyMap(componentInstance);
            const definePropertyData = {
                value: dependencyMap,
                configurable: false,
                writable: false,
                enumerable: false,
            };
            let component: FC<any> | ExoticComponent<any>;
            const interceptorClasses: Type[] = Reflect.getMetadata(
                DI_METADATA_USE_INTERCEPTORS_SYMBOL,
                componentInstance.metadata.Class,
            ) || [];
            const interceptorInstances = interceptorClasses.map((InterceptorClass) => {
                return dependencyMap.get(InterceptorClass);
            }).filter((instance) => !!instance && typeof instance.intercept === 'function');

            const forwardRef: FactoryForwardRef = (promise) => {
                return promise.then((result) => {
                    if (Object.getOwnPropertyDescriptor(result.default, DEPS_PROPERTY_NAME)) {
                        return result;
                    }

                    Object.defineProperty(
                        result.default,
                        DEPS_PROPERTY_NAME,
                        definePropertyData,
                    );

                    return result;
                });
            };

            if (typeof componentInstance.metadata.factory === 'function') {
                component = componentInstance.metadata.factory(forwardRef);
            }

            if (!Object.getOwnPropertyDescriptor(component, DEPS_PROPERTY_NAME)) {
                Object.defineProperty(
                    component,
                    DEPS_PROPERTY_NAME,
                    definePropertyData,
                );
            }

            return createElement(() => {
                const fallback = componentInstance.metadata.interceptorsFallback = null;
                const [interceptorEnd, setInterceptorEnd] = useState<boolean>(false);
                const routeLocation = useLocation();
                const routeParams = useParams();
                const routeSearchParams = useSearchParams();

                useAsyncEffect(async () => {
                    try {
                        if (routeLocation && routeParams && routeSearchParams) {
                            for (const interceptorInstance of interceptorInstances) {
                                await interceptorInstance.intercept(props, {
                                    route: {
                                        location: routeLocation,
                                        params: routeParams,
                                        searchParams: routeSearchParams,
                                    },
                                });
                            }
                        }
                    } finally {
                        setInterceptorEnd(true);
                    }
                }, [
                    routeLocation,
                    routeParams,
                    routeSearchParams,
                ]);

                return interceptorEnd
                    ? createElement(
                        component,
                        {
                            ...props,
                            $container: {
                                get: <T>(ProviderClass: Type): T => {
                                    return dependencyMap.get(ProviderClass);
                                },
                            },
                        },
                    )
                    : fallback;
            });
        });
    },
};

export default platform;
