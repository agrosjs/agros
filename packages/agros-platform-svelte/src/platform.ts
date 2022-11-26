import 'reflect-metadata';
import {
    AddVirtualFile,
    Platform,
} from '@agros/tools/lib/platform.interface';
import { EnsureImportOptions } from '@agros/tools/lib/types';

const platform: Platform = {
    getLoaderImports(): Omit<EnsureImportOptions, 'statements'>[] {
        return [
            {
                libName: '@agros/platform-svelte/lib/svelte-router',
                identifierName: 'Router',
            },
            {
                libName: './__temp_App__.svelte',
                identifierName: 'TempApp',
                type: 'default',
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
                libName: '@agros/common',
                identifierName: 'ROUTES_ROOT',
            },
            {
                libName: '@agros/common',
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
            'src/__temp_App__.svelte',
            `
                <script>
                    import {
                        EasyrouteProvider,
                        RouterOutlet,
                    } from '@agros/platform-svelte/lib/svelte-router';
                    export let config = {};
                    export let factory = null;
                    export let map = {};
                    export let mode;
                    const {
                        module: Module,
                        container = document.getElementById('root'),
                    } = config;
                    let factoryPromise;
                    if (factory) {
                        factoryPromise = factory.create(Module).then((componentInstance) => {
                            const rootModuleInstance = factory.getRootModuleInstance();
                            const rootRoutes = rootModuleInstance.getBaseProvider(map['ROUTES_ROOT'])?.value;
                            return map['RouterModule'].createRouterItems(factory, rootRoutes).then((routeItems) => {
                                const routes = map['createRoutes'](routeItems);
                                if (routes && Array.isArray(routes) && routes.length > 0) {
                                    return {
                                        type: 'router',
                                        value: new map['Router']({
                                            mode,
                                            routes,
                                        }),
                                    };
                                } else {
                                    return {
                                        type: 'single',
                                        value: componentInstance.getComponent(),
                                    };
                                }
                            });
                        });
                    } else {
                        factoryPromise = Promise.resolve({});
                    }
                </script>
                {#await factoryPromise}
                <span></span>
                {:then result}
                {#if result.type === 'router'}
                <EasyrouteProvider router={result.value}>
                    <RouterOutlet />
                </EasyrouteProvider>
                {:else if result.type === 'single'}
                <svelte:component this={result.value} />
                {/if}
                {/await}
            `,
        );
        const factoryIdentifier = map['factory'] || 'factory';
        return `
            const modeMap = {
                hash: ${map['hashMode']},
                history: ${map['historyMode']},
                silent: ${map['silentMode']},
            };
            const {
                RouterComponent,
                container = document.getElementById('root'),
            } = config;
            const app = new ${map['TempApp'] || 'TempApp'}({
                target: container,
                props: {
                    factory: ${factoryIdentifier},
                    mode: modeMap[RouterComponent],
                    config,
                    map: {
                        ${Object.keys(map).map((value) => `'${value}': ${map[value]}`).join(',')}
                    },
                },
            });
            return app;
        `;
    },
    getEntryTailCode({
        bootstrapReturnValueIdentifier,
    }) {
        return [
            `export default ${bootstrapReturnValueIdentifier};`,
        ];
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
                    ${lazy ? `const Component = () => import('${absoluteFilePath}');` : `const Component = import('${absoluteFilePath}');`}
                    import __AGROS_FACTORY__ from '${factoryPath.replace(/\\/g, '\\\\')}';
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
                    const componentPromise = ${lazy ? 'Component()' : 'Promise.resolve(Component)'}.then((result) => result.default || result);
                </script>
                {#await interceptorPromises}
                <svelte:component this={componentInstance.metadata.interceptorsFallback || undefined} />
                {:then result}
                {#await componentPromise}
                <svelte:component this={componentInstance.metadata.suspenseFallback || undefined} />
                {:then component}
                <svelte:component this={component} {...$$props} />
                {/await}
                {/await}
            `,
        );
        return `() => import('${pathname.replace(/\\/g, '\\\\')}')`;
    },
};

export default platform;
