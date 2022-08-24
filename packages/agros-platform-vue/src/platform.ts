import 'reflect-metadata';
import { ComponentInstance } from '@agros/common/lib/component-instance.class';
import { Platform } from '@agros/platforms/lib/platform.interface';
import { EnsureImportOptions } from '@agros/utils/lib/ensure-import';

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
        return `
            const {
                module: Module,
                RouterComponent = ${vueRouterIdentifier}.createWebHashHistory(),
                routerProps,
                container = document.getElementById('root'),
            } = config;
            ${ensuredImportsMap['factory'] || 'factory'}.create(Module).then((routeItems) => {
                const routes = ${ensuredImportsMap['createRoutes'] || 'createRoutes'}(routeItems).map((route) => {
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
};

export default platform;
