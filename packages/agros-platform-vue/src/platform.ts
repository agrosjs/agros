import 'reflect-metadata';
import { Platform } from '@agros/tools/lib/platform.interface';
import { EnsureImportOptions } from '@agros/tools/lib/types';

const platform: Platform = {
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
            {
                libName: '@agros/common',
                identifierName: 'ROUTES_ROOT',
            },
            {
                libName: '@agros/common',
                identifierName: 'RouterModule',
            },
            {
                libName: '@agros/platform-vue/lib/create-routes',
                identifierName: 'createRoutes',
            },
        ];
    },
    getDecoratorImports(): Omit<EnsureImportOptions, 'statements'>[] {
        return [];
    },
    getBootstrapCode(ensuredImportsMap: Record<string, string>): string {
        const vueIdentifier = ensuredImportsMap['Vue'] || 'Vue';
        const vueRouterIdentifier = ensuredImportsMap['VueRouter'] || 'VueRouter';
        const factoryIdentifier = ensuredImportsMap['factory'] || 'factory';
        return `
            const {
                module: Module,
                RouterComponent = ${vueRouterIdentifier}.createWebHashHistory(),
                routerProps,
                container = document.getElementById('root'),
            } = config;
            ${ensuredImportsMap['factory'] || 'factory'}.create(Module).then((componentInstance) => {
                const rootModuleInstance = ${factoryIdentifier}.getRootModuleInstance();
                const rootRoutes = rootModuleInstance.getProviderValue(${ensuredImportsMap['ROUTES_ROOT']});
                ${ensuredImportsMap['RouterModule']}.createRouterItems(${factoryIdentifier}, rootRoutes).then((routeItems) => {
                    if (routeItems && Array.isArray(routeItems) && routeItems.length > 0) {
                        const routes = ${ensuredImportsMap['createRoutes']}(routeItems).map((route) => {
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
                    } else {
                        ${vueIdentifier}.createApp(componentInstance.getComponent()).mount(container);
                    }
                });
            });
        `;
    },
    getComponentFactoryCode({
        filePath,
        componentIdentifierName,
        lazy = false,
    }) {
        return `() => ${lazy ? `() => import('${filePath}')` : componentIdentifierName};`;
    },
};

export default platform;
