import 'reflect-metadata';
import { ComponentInstance } from '@agros/common/lib/component-instance.class';
import { Platform } from '@agros/platforms/lib/platform.interface';
import { EnsureImportOptions } from '@agros/utils/lib/ensure-import';
import {
    createElement,
    useState,
    Suspense,
} from 'react';
import { Route } from 'react-router-dom';
import { useAsyncEffect } from 'use-async-effect';
import { RouterItem } from '@agros/common/lib/types';

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
                libName: '@agros/app/lib/constants',
                identifierName: 'ROUTES_ROOT',
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
        const platformIdentifier = ensuredImportsMap['platform'] || 'platform';
        return `
            const {
                module: Module,
                RouterComponent,
                routerProps,
                container = document.getElementById('root'),
            } = config;
            ${factoryIdentifier}.create(Module).then((componentInstance) => {
                const rootModuleInstance = ${factoryIdentifier}.getRootModuleInstance();
                const routes = rootModuleInstance.getProviderValue(${ensuredImportsMap['ROUTES_ROOT']});

                if (routes && Array.isArray(routes) && routes.length > 0) {
                    const RootContainer = ({
                        Module,
                        routerProps = {},
                        RouterComponent = ${ensuredImportsMap['BrowserRouter'] || 'BrowserRouter'},
                    }) => {
                        const elements = ${platformIdentifier}.createRoutes(routes);
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
                } else {
                    ${ensuredImportsMap['render'] || 'render'}(
                        ${reactIdentifier}.createElement(componentInstance.getComponent()),
                        container,
                    );
                }
            });
        `;
    },
    getComponentFactoryCode(
        map: Record<string, string>,
        filePath: string,
        componentIdentifierName: string,
        lazy = false,
    ) {
        return `() => ${lazy ? `${map['React'] || 'React'}.lazy(() => import('${filePath}'))` : componentIdentifierName};`;
    },
    async generateComponent<T = any>(componentInstance: ComponentInstance, component: any): Promise<T> {
        /**
         * set component directly so that it can prevent unlimited creating tasks
         */
        componentInstance.setComponent((props: any) => {
            const {
                interceptorsFallback = null,
                suspenseFallback = null,
            } = componentInstance.metadata;
            const [interceptorEnd, setInterceptorEnd] = useState<boolean>(false);

            useAsyncEffect(async () => {
                try {
                    if (Array.isArray(componentInstance.metadata.interceptorInstances)) {
                        for (const interceptorInstance of componentInstance.metadata.interceptorInstances) {
                            await interceptorInstance.intercept({
                                props,
                            });
                        }
                    }
                } finally {
                    setInterceptorEnd(true);
                }
            }, []);

            return interceptorEnd
                ? createElement(
                    Suspense,
                    {
                        fallback: suspenseFallback,
                    },
                    createElement(component, props),
                )
                : interceptorsFallback;
        });

        return component;
    },
    createRoutes(routerItems: RouterItem[], level = 0) {
        return routerItems.map((routerItem, index) => {
            const {
                componentInstance,
                children,
                ...routeProps
            } = routerItem;
            const Component = componentInstance.getComponent();

            return createElement(
                Route,
                {
                    key: `level${level}_${index}`,
                    ...routeProps,
                    ...(
                        Component
                            ? {
                                element: Component,
                            }
                            : {}
                    ),
                },
                (Array.isArray(children) && children.length > 0) ? platform.createRoutes(children, level + 1) : [],
            );
        });
    },
};

export default platform;
