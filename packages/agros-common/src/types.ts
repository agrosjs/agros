import { CollectionType } from '@agros/config';
import { Dirent } from 'fs';
import { ComponentInstance } from './component-instance.class';

export interface PathDescriptor extends Omit<Dirent, 'name'> {
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
}

export interface RootPointDescriptor extends EntityDescriptor {
    localName: string;
    exportName: string | 'default';
    name: string;
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

export type FactoryForwardRef = <T = any>(promise: Promise<{ default: T }>) => Promise<{ default: T }>;

export type ComponentMetadata = Omit<ComponentDecoratorOptions, 'declarations' | 'file' | 'lazy'> & {
    factory?: (forwardRef: FactoryForwardRef) => any;
};

export type Type<T = any> = new (...args: Array<any>) => T;
export type AsyncModuleClass<T = any> = Type<T> | Promise<Type>;

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
}

export interface RootContainerProps {
    module: Type;
    routerProps?: any;
    RouterComponent?: any;
}

export interface BootstrapConfigItem extends RootContainerProps {
    container?: HTMLElement;
}
