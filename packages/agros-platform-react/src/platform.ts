import 'reflect-metadata';
import {
    Factory,
    FactoryForwardRef,
    Type,
} from '@agros/common/lib/types';
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
import { defineContainer } from '@agros/common/lib/define-container';

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
                    const routeItems = ${ensuredImportsMap['factory'] || 'factory'}.create(RootModule);
                    setRouterItems(routeItems);
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
            }) => {
                const elements = useRouteElements(Module);

                return ${reactIdentifier}.createElement(
                    RouterComponent,
                    routerProps,
                    ${reactIdentifier}.createElement(${ensuredImportsMap['Routes'] || 'Routes'}, {}, elements),
                );
            };

            const bootstrap = (config) => {
                if (!config) {
                    return;
                }

                const {
                    module: Module,
                    RouterComponent,
                    routerProps,
                    container = document.getElementById('root'),
                } = config;

                ${ensuredImportsMap['render'] || 'render'}(
                    ${reactIdentifier}.createElement(RootContainer, {
                        module: Module,
                        RouterComponent,
                        routerProps,
                    }),
                    container,
                );
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
            let component: FC<any> | ExoticComponent<any>;

            const forwardRef: FactoryForwardRef = (promise) => {
                return promise.then((result) => {
                    defineContainer(result.default || result, dependencyMap);
                    return result;
                });
            };

            if (typeof componentInstance.metadata.factory === 'function') {
                component = componentInstance.metadata.factory(forwardRef);
            }

            if (!componentInstance.metadata.lazy) {
                defineContainer(component, dependencyMap);
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
                            if (Array.isArray(componentInstance.metadata.interceptorInstances)) {
                                for (const interceptorInstance of componentInstance.metadata.interceptorInstances) {
                                    await interceptorInstance.intercept({
                                        props,
                                        route: {
                                            location: routeLocation,
                                            params: routeParams,
                                            searchParams: routeSearchParams,
                                        },
                                    });
                                }
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
