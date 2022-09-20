import { ComponentInstance } from './component-instance.class';
import { Map as ImmutableMap } from 'immutable';
import { ModuleInstance } from './module-instance.class';
import { Statement } from '@babel/types';
import { Configuration } from 'webpack';
import { Dirent } from 'fs';

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
    provide: string;
    useValue: T;
}

export type Type<T = any> = new (...args: Array<any>) => T;
export type AsyncModuleClass<T = any> = Type<T> | Promise<Type> | ValueProvider;

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
    providers?: Array<Type>;
    components?: Array<Type>;
    exports?: Array<Type>;
}

export interface ModuleMetadata {
    imports: Set<AsyncModuleClass>;
    providers: Set<Type<any>>;
    exports: Set<Type<any>>;
    components: Set<Type<any>>;
    routes: Set<RouteOptionItem>;
}

export interface ModuleInstanceMetadata extends ModuleMetadata {
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

export interface PlatformConfig {
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
