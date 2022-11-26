import { ComponentInstance } from './component-instance.class';
import { Map as ImmutableMap } from 'immutable';
import { ModuleInstance } from './module-instance.class';
import { Statement } from '@babel/types';
import { Configuration } from 'webpack';
import { Dirent } from 'fs';
import * as t from '@babel/types';
import { ParseResult } from '@babel/parser';
import { ClassImportItem } from './detectors';

export type CollectionMap = Record<string, string[]>;
export type CollectionType = 'module' | 'service' | 'component' | 'interceptor';

export interface CodeLocation {
    start: number;
    end: number;
}

export interface ComponentScript {
    content: string;
    location?: CodeLocation;
}

export interface BundlessPlatform {
    getComponentScript?: (source: string) => ComponentScript;
}

export interface ComponentDecoratorOptions<T = any> {
    file?: string;
    lazy?: boolean;
    styles?: string[];
    declarations?: Type[];
    elementProps?: T;
    suspenseFallback?: any;
    interceptorsFallback?: any;
}

export type ComponentMetadata = Omit<ComponentDecoratorOptions, 'declarations'> & {
    uuid: string;
    factory?: () => any;
};

export interface ValueProvider<T = any> {
    provide: ProviderToken;
    useValue: T;
    inject?: never;
}

export interface FactoryProvider<T = any> {
    provide: ProviderToken;
    /**
     * Factory function that returns an instance of the provider to be injected.
     */
    useFactory: (...args: any[]) => T | Promise<T>;
    inject?: Type<any>[];
}

export type Type<T = any> = new (...args: Array<any>) => T;
export type AsyncModuleClass<T = any> = Type<T> | Promise<Type<T>> | DynamicModule<T>;

export type BaseProvider = ValueProvider | FactoryProvider;
export type Provider<T = any> = Type<T> | BaseProvider;

export type BaseProviderWithValue<T = any> = BaseProvider & {
    value: T;
};

export type ProviderWithValue<T = any, V = any> = Type<T> | BaseProviderWithValue<V>;

export type ProviderToken = string | symbol;

export interface RouteProps<C = any, R = any> {
    caseSensitive?: boolean;
    children?: C;
    element?: R | null;
    index?: boolean;
    path?: string;
}

export interface RouteOptionItem<T = any> extends Omit<RouteProps, 'element' | 'children'> {
    useModuleClass?: AsyncModuleClass;
    useComponentClass?: Type;
    children?: RouteOptionItem<T>[];
}

export interface RouterItem extends Omit<RouteOptionItem, 'useModuleClass' | 'useComponentClass' | 'children'> {
    componentInstance: ComponentInstance;
    children?: RouterItem[];
}

export interface ComponentInstanceMetadata extends ComponentMetadata {
    Class: Type;
    interceptorInstances?: Interceptor[];
}

export interface RootContainerProps {
    module: Type;
    routerProps?: any;
    RouterComponent?: any;
}

export interface BootstrapConfigItem extends RootContainerProps {
    container?: HTMLElement;
}

export interface ModuleDecoratorOptions {
    imports?: Array<AsyncModuleClass>;
    providers?: Array<Provider>;
    components?: Array<Type>;
    exports?: Array<Type>;
}

export interface ModuleMetadata {
    imports: Set<AsyncModuleClass>;
    providers: Set<Provider>;
    exports: Set<Type<any>>;
    components: Set<Type<any>>;
}

/**
 * Interface defining a Dynamic Module.
 * @publicApi
 */
export interface DynamicModule<T = any> extends ModuleDecoratorOptions {
    /**
     * A module reference
     */
    module: Type<T>;
    /**
     * When "true", makes a module global-scoped.
     *
     * Once imported into any module, a global-scoped module will be visible
     * in all modules. Thereafter, modules that wish to inject a service exported
     * from a global module do not need to import the provider module.
     *
     * @default false
     */
    global?: boolean;
}

export interface ModuleInstanceMetadata extends Omit<ModuleMetadata, 'imports' | 'providers'> {
    imports: Set<Type<any> | Promise<Type<any>>>;
    providers: Set<ProviderWithValue>;
    Class: Type<any>;
    isGlobal: boolean;
}

export interface Container {
    get: <T>(ProviderClass: Type) => T;
}

export interface ContainerForwardedComponentProps<Props> {
    props: Props;
    container: Container;
}

export type UseInterceptorsDecoratorOptions = Type[];

export interface Factory {
    create: <T = any>(ModuleClass: Type<T>) => Promise<ComponentInstance>;
    generateDependencyMap: (componentInstanceOrId: ComponentInstance | string) => ImmutableMap<Type<any>, any>;
    getModuleInstanceMap: () => Map<Type<any>, ModuleInstance>;
    getRootModuleInstance: () => ModuleInstance;
    getComponentInstanceMap: () => Map<Type<any>, ComponentInstance>;
}

export interface Interceptor {
    intercept: <T = any, R = undefined>(context?: T, ...args: any[]) => Promise<R> | R | null | undefined;
}

export type EnsureImportType = 'named' | 'default' | 'namespace';

export interface EnsureImportOptions {
    statements: Statement[];
    libName: string;
    identifierName: string;
    type?: EnsureImportType;
}

export interface EnsureImportResult {
    statements: Statement[];
    identifierName: string;
}

export interface PlatformFiles {
    create: string;
    generate: {
        componentDescription: string;
    };
}

export interface PlatformConfig {
    files: PlatformFiles;
    withoutComponentDescriptionFileExtension?: boolean;
    bundlessPlatform?: string;
    configWebpack?: (config: Configuration) => Configuration;
}

export interface PathDescriptor extends Omit<Dirent, 'name'> {
    id: string;
    relativePath: string;
    absolutePath: string;
    aliasPath: string;
    filename: string;
}

export interface CollectionDescriptor extends PathDescriptor {
    collectionType: CollectionType;
}

export interface EntityDescriptor extends CollectionDescriptor {
    entityName: string;
    moduleName: string;
    modules: EntityDescriptor[];
}

export interface RootPointDescriptor extends EntityDescriptor {
    localName: string;
    exportName: string | 'default';
    name: string;
}

export interface UpdateItem {
    line: number;
    content: string[];
    deleteLines: number;
    cutLine?: t.SourceLocation;
};

export type Updater<T> = (data: {
    sourceDescriptor: EntityDescriptor,
    targetDescriptor: EntityDescriptor,
    targetAST: ParseResult<t.File>,
    classImportItem: ClassImportItem<t.ClassDeclaration>,
    initialResult: UpdateItem[],
    options?: T;
}) => Promise<UpdateItem[]>;

export type UpdaterWithChecker<T = any> = (
    sourceDescriptor: EntityDescriptor,
    targetDescriptor: EntityDescriptor,
    options?: T,
) => Promise<UpdateItem[]>;

export interface AddImportedEntityToModuleOptions {
    skipExport?: boolean;
    asyncModule?: boolean,
}

export interface AddImportedServiceToServiceOptions {
    skipReadonly?: boolean;
    accessibility?: 'public' | 'private' | 'protected';
}

export interface AddRouteToModuleOptions {
    path?: string;
}
