import 'reflect-metadata';
import { ComponentInstance } from '@agros/common/lib/component-instance.class';
import { Platform } from '@agros/platforms/lib/platform.interface';
import { EnsureImportOptions } from '@agros/utils/lib/ensure-import';
import {
    createElement,
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
        const factoryIdentifier = ensuredImportsMap['factory'] || 'factory';
        return `
            const {
                module: Module,
                RouterComponent,
                routerProps,
                container = document.getElementById('root'),
            } = config;
            ${factoryIdentifier}.create(Module).then((routeItems) => {
                const RootContainer = ({
                    Module,
                    routerProps = {},
                    RouterComponent = ${ensuredImportsMap['BrowserRouter'] || 'BrowserRouter'},
                }) => {
                    const elements = ${ensuredImportsMap['createRoutes'] || 'createRoutes'}(routeItems);

                    return ${reactIdentifier}.createElement(
                        RouterComponent,
                        routerProps,
                        ${reactIdentifier}.createElement(${ensuredImportsMap['Routes'] || 'Routes'}, {}, elements),
                    );
                };
                ${ensuredImportsMap['render'] || 'render'}(
                    ${reactIdentifier}.createElement(RootContainer, {
                        Module,
                        RouterComponent,
                        routerProps,
                    }),
                    container,
                );
            });
        `;
    },
    getComponentFactoryCode(map: Record<string, string>, filePath: string, lazy = false) {
        const componentIdentifierName = 'Agros$$CurrentComponent';
        return {
            factoryCode: `() => ${lazy ? `${map['React'] || 'React'}.lazy(() => import('${filePath}'))` : componentIdentifierName};`,
            importCodeLines: lazy
                ? []
                : [`const ${componentIdentifierName} = import('${filePath}');`],
        };
    },
    async generateComponent<T = any>(componentInstance: ComponentInstance, component: any): Promise<T> {
        /**
         * set component directly so that it can prevent unlimited creating tasks
         */
        componentInstance.setComponent((props: any) => {
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
                    props,
                )
                : fallback;
        });

        return component;
    },
};

export default platform;
