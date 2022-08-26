import 'reflect-metadata';
import { ComponentInstance } from '@agros/common/lib/component-instance.class';
import { Platform } from '@agros/platforms/lib/platform.interface';
import { EnsureImportOptions } from '@agros/utils/lib/ensure-import';
import {
    defineAsyncComponent,
    defineComponent,
} from 'vue';
import { RouterItem } from '@agros/common/lib/types';

const platform: Platform = {
    getDefaultConfig() {
        return {};
    },
    getLoaderImports(): Omit<EnsureImportOptions, 'statements'>[] {
        return [
            {
                libName: '@agros/platform-vue/lib/vue-router',
                identifierName: 'VueRouter',
                type: 'namespace',
            },
            {
                libName: '@agros/platform-vue/lib/vue',
                identifierName: 'Vue',
                type: 'namespace',
            },
        ];
    },
    getDecoratorImports(): Omit<EnsureImportOptions, 'statements'>[] {
        return [];
    },
    getBootstrapCode(ensuredImportsMap: Record<string, string>): string {
        const vueIdentifier = ensuredImportsMap['Vue'] || 'Vue';
        const vueRouterIdentifier = ensuredImportsMap['VueRouter'] || 'VueRouter';
        const platformIdentifier = ensuredImportsMap['platform'] || 'platform';
        return `
            const {
                module: Module,
                RouterComponent = ${vueRouterIdentifier}.createWebHashHistory(),
                routerProps,
                container = document.getElementById('root'),
            } = config;
            ${ensuredImportsMap['factory'] || 'factory'}.create(Module).then((routeItems) => {
                const routes = ${platformIdentifier}.createRoutes(routeItems).map((route) => {
                    return {
                        ...route,
                        path: '/' + route.path,
                    };
                });
                const router = ${vueRouterIdentifier}.createRouter({
                    history: RouterComponent,
                    routes,
                });
                const app = ${vueIdentifier}.createApp({
                    template: '<router-view></router-view>',
                });
                app.use(router);
                app.mount(container);
            });
        `;
    },
    getComponentFactoryCode(map: Record<string, string>, filePath: string, lazy = false) {
        const componentIdentifierName = 'Agros$$CurrentComponent';
        return {
            factoryCode: `() => ${lazy ? `() => import('${filePath}')` : componentIdentifierName};`,
            importCodeLines: lazy
                ? []
                : [`const ${componentIdentifierName} = import('${filePath}');`],
        };
    },
    async generateComponent<T = any>(componentInstance: ComponentInstance, component: any): Promise<T> {
        componentInstance.setComponent(component);
        return component;
    },
    createRoutes(routerItems: RouterItem[], level = 0) {
        return routerItems.map((routerItem) => {
            const {
                componentInstance,
                children,
                ...routeProps
            } = routerItem;
            const component = componentInstance.getComponent();
            const {
                lazy,
                suspenseFallback,
                interceptorsFallback,
                interceptorInstances = [],
            } = componentInstance.metadata;

            let loadingComponent = interceptorsFallback || suspenseFallback;

            if (typeof loadingComponent === 'string') {
                loadingComponent = defineComponent({
                    template: loadingComponent,
                });
            }

            return {
                path: routeProps.path,
                component: !lazy
                    ? interceptorInstances.length === 0
                        ? component
                        : defineAsyncComponent({
                            loader: async () => {
                                for (const interceptorInstance of interceptorInstances) {
                                    await interceptorInstance.intercept();
                                }
                                return component;
                            },
                        })
                    : defineAsyncComponent({
                        loader: interceptorInstances.length === 0
                            ? component
                            : async () => {
                                for (const interceptorInstance of interceptorInstances) {
                                    await interceptorInstance.intercept();
                                }
                                return component();
                            },
                        loadingComponent,
                    }),
                ...(
                    (Array.isArray(children) && children.length > 0)
                        ? {
                            children: platform.createRoutes(children, level + 1) || [],
                        }
                        : {}
                ),
            };
        });
    },
};

export default platform;
