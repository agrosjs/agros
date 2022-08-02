import {
    Container,
    ContainerForwardedComponentProps,
    DEPS_PROPERTY_NAME,
    DI_METADATA_USE_INTERCEPTORS_SYMBOL,
    Factory,
    FactoryForwardRef,
    RouterItem,
    Type,
} from '@agros/common';
import { ComponentInstance } from '@agros/common/lib/component-instance.class';
import { AbstractPlatform } from '@agros/platforms';
import {
    EnsureImportOptions,
    permanentlyReadJson,
    runCommand,
} from '@agros/utils';
import {
    createElement,
    ExoticComponent,
    FC,
    ReactElement,
    Suspense,
    useState,
} from 'react';
import {
    Route,
    useLocation,
    useParams,
    useSearchParams,
} from 'react-router-dom';
import 'reflect-metadata';
import { useAsyncEffect } from 'use-async-effect';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '@agros/logger';

export { loadPlatform } from '@agros/utils/lib/platform-loader';

export default class PlatformReact extends AbstractPlatform implements AbstractPlatform {
    public getLoaderImports(): Omit<EnsureImportOptions, 'statements'>[] {
        return [
            {
                libName: '@agros/platform/react/lib/react-router-dom',
                identifierName: 'Routes',
            },
            {
                libName: '@agros/platform/react/lib/react-router-dom',
                identifierName: 'Route',
            },
            {
                libName: '@agros/platform/react/lib/react-router-dom',
                identifierName: 'BrowserRouter',
            },
            {
                libName: '@agros/app/lib/factory',
                identifierName: 'Factory',
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
            {
                libName: '@agros/platform-react',
                identifierName: 'loadPlatform',
            },
        ];
    }

    public getDecoratorImports(): Omit<EnsureImportOptions, 'statements'>[] {
        return [
            {
                libName: '@agros/app/lib/constants',
                identifierName: 'DI_METADATA_COMPONENT_SYMBOL',
            },
            {
                libName: '@agros/app/lib/constants',
                identifierName: 'DI_DEPS_SYMBOL',
            },
        ];
    }

    public getComponentDecoratorCode(ensuredImportsMap: Record<string, string>): string {
        return `
            function Agros$$ComponentWithFactory(options): ClassDecorator {
                const {
                    declarations = [],
                    ...metadataValue
                } = options;
                return (target) => {
                    Reflect.defineMetadata(
                        ${ensuredImportsMap['DI_METADATA_COMPONENT_SYMBOL']},
                        metadataValue,
                        target,
                    );
                    Reflect.defineMetadata(${ensuredImportsMap['DI_DEPS_SYMBOL']}, declarations, target);
                };
            }
        `;
    }

    public runCommand(command: string) {
        const logger = new Logger();

        if (!command) {
            logger.error('Command must be specified');
            process.exit(1);
        }

        if (
            [
                'build',
                'start',
                'test',
            ].indexOf(command) === -1
        ) {
            logger.error(`Command "${command}" does not match none of the supported commands`);
            process.exit(1);
        }

        let reactAppRewiredBinaryPath = path.resolve(
            path.dirname(require.resolve('react-app-rewired')),
            `bin/${command === 'test' ? 'jest.js' : 'index.js'}`,
        );

        if (!fs.existsSync(reactAppRewiredBinaryPath)) {
            reactAppRewiredBinaryPath = path.resolve(
                process.cwd(),
                `bin/${command === 'test' ? 'jest.js' : 'index.js'}`,
            );
        }

        if (!fs.existsSync(reactAppRewiredBinaryPath)) {
            logger.error('Fatal: lost engine files');
            process.exit(1);
        }

        runCommand(
            'node',
            [
                reactAppRewiredBinaryPath,
                command,
                ...(
                    this.overridesFileExists()
                        ? []
                        : [
                            '--config-overrides',
                            path.resolve(__dirname, '../config-overrides.js'),
                        ]
                ),
            ],
            {
                stdio: 'inherit',
                env: {
                    ...process.env,
                    BROWSER: 'none',
                },
            },
        );
    }

    public getBootstrapCode(ensuredImportsMap: Record<string, string>): string {
        const reactIdentifier = ensuredImportsMap['React'] || 'React';
        return `
            const platform = ${ensuredImportsMap['loadPlatform'] || 'platform'}('@agros/platform-react');

            const useRouteElements = (Module) => {
                const [routerItems, setRouterItems] = ${reactIdentifier}.useState([]);
                const [elements, setElements] = ${reactIdentifier}.useState(null);

                ${reactIdentifier}.useEffect(() => {
                    const RootModule = Module;
                    const factory = new ${ensuredImportsMap['Factory'] || 'Factory'}();
                    factory.create(RootModule).then((items) => {
                        setRouterItems(items);
                    });
                }, [Module]);

                ${reactIdentifier}.useEffect(() => {
                    const elements = platform.getRoutes(routerItems);
                    setElements(elements);
                }, [routerItems]);

                return elements;
            };

            const RootContainer = ({
                module: Module,
                routerProps = {},
                RouterComponent = ${ensuredImportsMap['BrowserRouter'] || 'BrowserRouter'},
            }: any) => {
                const elements = useRouteElements(Module);

                return ${reactIdentifier}.createElement(
                    RouterComponent,
                    routerProps,
                    ${reactIdentifier}.createElement(${ensuredImportsMap['Routes'] || 'Routes'}, {}, elements),
                );
            };

            const bootstrap = (configList) => {
                if (!Array.isArray(configList)) {
                    return;
                }

                for (const configItem of configList) {
                    const {
                        module: Module,
                        RouterComponent,
                        routerProps,
                        container = document.getElementById('root'),
                    } = configItem;

                    ${ensuredImportsMap['render'] || 'render'}(
                        ${reactIdentifier}.createElement(RootContainer, {
                            module: Module,
                            RouterComponent,
                            routerProps,
                        }),
                        container,
                    );
                }
            };
        `;
    }

    public getComponentFactoryCode(filePath: string, lazy = false) {
        const componentIdentifierName = 'Agros$$CurrentComponent';
        return {
            factoryCode: `forwardRef => ${lazy ? `forwardRef(import(${filePath}))` : componentIdentifierName}`,
            importCodeLines: lazy
                ? []
                : [`import ${componentIdentifierName} from '${filePath}';`],
        };
    }

    public getRoutes(routerItems: RouterItem[], level = 0) {
        return routerItems.map((routerItem, index) => {
            const {
                componentInstance,
                children,
                ...routeProps
            } = routerItem;

            const {
                suspenseFallback = null,
                elementProps = {},
            } = componentInstance.metadata;

            const Component = componentInstance.getComponent();

            const createAppRouterElement = (Component) => {
                return createElement(
                    Suspense,
                    {
                        fallback: suspenseFallback,
                    },
                    createElement(Component, elementProps),
                );
            };

            return createElement(
                Route,
                {
                    key: `level${level}_${index}`,
                    ...routeProps,
                    ...(
                        Component
                            ? {
                                element: createAppRouterElement(Component),
                            }
                            : {}
                    ),
                },
                (Array.isArray(children) && children.length > 0) ? this.getRoutes(children, level + 1) : [],
            );
        });
    }

    public generateComponent<T = any>(componentInstance: ComponentInstance, context: Factory): T {
        const component = componentInstance.getComponent();

        if (component) {
            return component as T;
        }

        /**
         * set component directly so that it can prevent unlimited creating tasks
         */
        componentInstance.setComponent((props: any) => {
            const dependencyMap = context.generateDependencyMap(componentInstance);
            const definePropertyData = {
                value: dependencyMap,
                configurable: false,
                writable: false,
                enumerable: false,
            };
            let component: FC<any> | ExoticComponent<any>;
            const interceptorClasses: Type[] = Reflect.getMetadata(
                DI_METADATA_USE_INTERCEPTORS_SYMBOL,
                componentInstance.metadata.Class,
            ) || [];
            const interceptorInstances = interceptorClasses.map((InterceptorClass) => {
                return dependencyMap.get(InterceptorClass);
            }).filter((instance) => !!instance && typeof instance.intercept === 'function');

            const forwardRef: FactoryForwardRef = (promise) => {
                return promise.then((result) => {
                    if (Object.getOwnPropertyDescriptor(result.default, DEPS_PROPERTY_NAME)) {
                        return result;
                    }

                    Object.defineProperty(
                        result.default,
                        DEPS_PROPERTY_NAME,
                        definePropertyData,
                    );

                    return result;
                });
            };

            if (typeof componentInstance.metadata.factory === 'function') {
                component = componentInstance.metadata.factory(forwardRef);
            }

            if (!Object.getOwnPropertyDescriptor(component, DEPS_PROPERTY_NAME)) {
                Object.defineProperty(
                    component,
                    DEPS_PROPERTY_NAME,
                    definePropertyData,
                );
            }

            return createElement(() => {
                const fallback = componentInstance.metadata.interceptorsFallback = null;
                const [interceptorEnd, setInterceptorEnd] = useState<boolean>(false);
                const routeLocation = useLocation();
                const routeParams = useParams();
                const routeSearchParams = useSearchParams();

                useAsyncEffect(async () => {
                    try {
                        if (routeLocation && routeParams && routeSearchParams) {
                            for (const interceptorInstance of interceptorInstances) {
                                await interceptorInstance.intercept(props, {
                                    route: {
                                        location: routeLocation,
                                        params: routeParams,
                                        searchParams: routeSearchParams,
                                    },
                                });
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
                        {
                            ...props,
                            $container: {
                                get: <T>(ProviderClass: Type): T => {
                                    return dependencyMap.get(ProviderClass);
                                },
                            },
                        },
                    )
                    : fallback;
            });
        });
    }

    private overridesFileExists() {
        const cwd = process.cwd();

        if (fs.existsSync(path.resolve(cwd, 'config-overrides.js'))) {
            return true;
        }

        if (permanentlyReadJson(path.resolve(cwd, 'package.json'))['config-overrides-path']) {
            return true;
        }

        return false;
    };
}

export const forwardContainer = <Props>(
    render: (props: ContainerForwardedComponentProps<Props>) => ReactElement,
) => {
    return ({ $container, ...props }: Props & { $container: Container }) => {
        const componentProps = props as unknown as Props;
        return createElement(
            render,
            {
                container: $container,
                props: componentProps,
            },
        );
    };
};
