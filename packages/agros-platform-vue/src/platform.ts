import 'reflect-metadata';
import { ComponentInstance } from '@agros/common/lib/component-instance.class';
import {
    Factory,
    FactoryForwardRef,
} from '@agros/common/lib/types';
import { Platform } from '@agros/platforms/lib/platform.interface';
import { EnsureImportOptions } from '@agros/utils/lib/ensure-import';
import { defineContainer } from '@agros/common/lib/define-container';

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
            function bootstrap(config) {
                const {
                    module: Module,
                    RouterComponent = ${vueRouterIdentifier}.createWebHashHistory(),
                    routerProps,
                    container = document.getElementById('root'),
                } = config;
                const routeItems = ${ensuredImportsMap['factory'] || 'factory'}.create(Module);
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
            };
        `;
    },
    getComponentFactoryCode(map: Record<string, string>, filePath: string, lazy = false) {
        const componentIdentifierName = 'Agros$$CurrentComponent';
        return {
            factoryCode: `forwardRef => ${lazy ? `() => forwardRef(import('${filePath}'))` : componentIdentifierName}`,
            importCodeLines: lazy
                ? []
                : [`import ${componentIdentifierName} from '${filePath}';`],
        };
    },
    generateComponent<T = any>(componentInstance: ComponentInstance, context: Factory): T {
        let component = componentInstance.getComponent();

        if (component) {
            return component as T;
        }

        const dependencyMap = context.generateDependencyMap(componentInstance);

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

        componentInstance.setComponent(component);

        return component;
    },
};

export default platform;
