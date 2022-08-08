import 'reflect-metadata';
import { ComponentInstance } from '@agros/common/lib/component-instance.class';
import {
    Factory,
    FactoryForwardRef,
    Interceptor,
    Type,
} from '@agros/common/lib/types';
import { Platform } from '@agros/platforms/lib/platform.interface';
import { EnsureImportOptions } from '@agros/utils/lib/ensure-import';
import { DI_METADATA_USE_INTERCEPTORS_SYMBOL } from '@agros/common/lib/constants';
import { defineAsyncComponent } from 'vue';
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
                type: 'default',
            },
            {
                libName: '@agros/app/lib/factory',
                identifierName: 'Factory',
            },
            {
                libName: '@agros/platform-vue/lib/vue',
                identifierName: 'Vue',
                type: 'default',
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
            const bootstrap = (configList) => {
                if (!Array.isArray(configList)) {
                    return;
                }

                for (const configItem of configList) {
                    const {
                        module: Module,
                        RouterComponent = ${vueRouterIdentifier}.createWebHashHistory(),
                        routerProps,
                        container = document.getElementById('root'),
                    } = configItem;

                    const factory = new ${ensuredImportsMap['Factory'] || 'Factory'}(${ensuredImportsMap['platform'] || 'platform'});

                    factory.create(RootModule).then((items) => {
                        const routes = ${ensuredImportsMap['createRoutes'] || 'createRoutes'}(items);
                        const router = ${vueRouterIdentifier}.createRouter({
                            history: RouterComponent,
                            routes,
                        });
                        const app = ${vueIdentifier}.createApp({});
                        app.use(router);
                        app.mount(container);
                    });
                }
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
        const interceptorClasses: Type[] = Reflect.getMetadata(
            DI_METADATA_USE_INTERCEPTORS_SYMBOL,
            componentInstance.metadata.Class,
        ) || [];

        const interceptorInstances: Interceptor[] = interceptorClasses.map((InterceptorClass) => {
            return dependencyMap.get(InterceptorClass);
        }).filter((instance) => !!instance && typeof instance.intercept === 'function');

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

        if (interceptorInstances.length > 0) {
            const interceptorsFallback = componentInstance.metadata.interceptorsFallback;
            componentInstance.setComponent(defineAsyncComponent({
                loader: async () => {
                    for (const interceptorInstance of interceptorInstances) {
                        await interceptorInstance.intercept();
                    }
                    return component;
                },
                loadingComponent: interceptorsFallback,
            }));
        } else {
            componentInstance.setComponent(component);
        }
    },
};

export default platform;
