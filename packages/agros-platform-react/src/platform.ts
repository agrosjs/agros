import 'reflect-metadata';
import { ComponentInstance } from '@agros/common/lib/component-instance.class';
import { Platform } from '@agros/platforms/lib/platform.interface';
import { EnsureImportOptions } from '@agros/utils/lib/ensure-import';
import {
    createElement,
    useState,
    Suspense,
} from 'react';
import { useAsyncEffect } from 'use-async-effect';

const platform: Platform = {
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
                libName: '@agros/app/lib/modules/router.module',
                identifierName: 'RouterModule',
            },
            {
                libName: '@agros/platform-react/lib/react-dom',
                identifierName: 'render',
            },
            {
                libName: '@agros/platform-react/lib/create-routes',
                identifierName: 'createRoutes',
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
            ${factoryIdentifier}.create(Module).then((componentInstance) => {
                const rootModuleInstance = ${factoryIdentifier}.getRootModuleInstance();
                const rootRoutes = rootModuleInstance.getProviderValue(${ensuredImportsMap['ROUTES_ROOT']});
                ${ensuredImportsMap['RouterModule']}.createRouterItems(${factoryIdentifier}, rootRoutes).then((routes) => {
                    if (routes && Array.isArray(routes) && routes.length > 0) {
                        const RootContainer = ({
                            Module,
                            routerProps = {},
                            RouterComponent = ${ensuredImportsMap['BrowserRouter'] || 'BrowserRouter'},
                        }) => {
                            const elements = ${ensuredImportsMap['createRoutes']}(routes);
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
};

export default platform;
