import 'reflect-metadata';
import {
    AddVirtualFile,
    Platform,
} from '@agros/platforms/lib/platform.interface';
import { EnsureImportOptions } from '@agros/utils/lib/ensure-import';

const platform: Platform = {
    getLoaderImports(): Omit<EnsureImportOptions, 'statements'>[] {
        return [
            {
                libName: '@agros/platform-svelte/lib/svelte-router',
                identifierName: 'svelteRouter',
                type: 'namespace',
            },
            {
                libName: '@agros/platform-svelte/lib/svelte-router',
                identifierName: 'hashMode',
            },
            {
                libName: '@agros/platform-svelte/lib/svelte-router',
                identifierName: 'historyMode',
            },
            {
                libName: '@agros/platform-svelte/lib/svelte-router',
                identifierName: 'silentMode',
            },
            {
                libName: '@agros/platform-svelte/lib/svelte',
                identifierName: 'svelte',
                type: 'namespace',
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
                libName: '@agros/platform-svelte/lib/create-routes',
                identifierName: 'createRoutes',
            },
        ];
    },
    getDecoratorImports(): Omit<EnsureImportOptions, 'statements'>[] {
        return [];
    },
    getBootstrapCode(
        map: Record<string, string>,
        addVirtualFile: AddVirtualFile,
    ): string {
        addVirtualFile(
            'src/temp__App.svelte',
            `
                <script>
                    import {
                        EasyrouteProvider,
                        RouterOutlet,
                    } from '@agros/platform-svelte/lib/svelte-router';
                    export let router = null;
                </script>
                <EasyrouteProvider {router}>
                    <RouterOutlet />
                </EasyrouteProvider>
            `,
        );
        const factoryIdentifier = map['factory'] || 'factory';
        return `
            import TempApp from './temp__App.svelte';
            const modeMap = {
                hash: ${map['hashMode']},
                history: ${map['historyMode']},
                silent: ${map['silentMode']},
            };
            const {
                module: Module,
                RouterComponent = 'hash',
                routerProps,
                container = document.getElementById('root'),
            } = config;
            ${factoryIdentifier}.create(Module).then((componentInstance) => {
                const rootModuleInstance = ${factoryIdentifier}.getRootModuleInstance();
                const rootRoutes = rootModuleInstance.getProviderValue(${map['ROUTES_ROOT']});
                ${map['RouterModule']}.createRouterItems(${factoryIdentifier}, rootRoutes).then((routes) => {
                    if (routes && Array.isArray(routes) && routes.length > 0) {
                        const router = new ${map['svelteRouter'] || 'svelteRouter'}.Router({
                            mode: modeMap[RouterConfig],
                            routes,
                        });
                        const app = new TempApp({
                            target: container,
                            props: {
                                router,
                            },
                        });
                        export default app;
                    } else {
                        const App = componentInstance.getComponent();
                        const app = new App({
                            target: container,
                        });
                        export default app;
                    }
                });
            });
        `;
    },
    getComponentFactoryCode({
        lazy = false,
        componentUuid,
        absoluteFilePath,
        factoryPath,
        addVirtualFile,
    }) {
        const pathname = addVirtualFile(
            `src/temp_${Math.random().toString(32).slice(2)}.svelte`,
            `
                <script>
                    ${lazy ? `const Component = () => import('${absoluteFilePath}');` : `import Component from '${absoluteFilePath}';`}
                    import __AGROS_FACTORY__ from '${factoryPath}';
                    const componentInstanceMap = __AGROS_FACTORY__.getComponentInstanceMap();
                    const componentInstance = Array.from(componentInstanceMap.values()).find((instance) => {
                        return instance.metadata.uuid === '${componentUuid}';
                    });
                    let interceptors = [];
                    if (componentInstance) {
                        interceptors = componentInstance.metadata.interceptorInstances || [];
                    }
                    if (!Array.isArray(interceptors)) {
                        interceptors = [];
                    }
                    const interceptorPromises = Promise.all(interceptors.map((interceptorInstance) => {
                        return interceptorInstance.intercept();
                    }));
                    const componentPromise = ${lazy ? 'Component().then((result) => result.default || result)' : 'Promise.resolve(Component)'};
                </script>
                {#await interceptorPromises}
                <svelte:component this={componentInstance.metadata.interceptorsFallback || undefined} />
                {:then result}
                {#await componentPromise}
                <svelte:component this={componentInstance.metadata.suspenseFallback || undefined} />
                {:then component}
                <svelte:component this={component} />
                {/await}
                {/await}
            `,
        );
        return {
            code: '() => TempComponent',
            modifier: (code) => `
                import TempComponent from '${pathname}';
                ${code}
            `,
        };
    },
};

export default platform;
