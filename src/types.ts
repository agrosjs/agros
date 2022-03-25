import React from 'react';
import { RouteProps } from 'react-router-dom';
import {
    AbstractComponent,
    ComponentInstance,
} from './classes';

export type Type<T = any> = new (...args: Array<any>) => T;

export type LazyLoadFactory = () => Promise<{
    default: React.ComponentType<any>;
}>;

export type LazyLoadParser = (lazyPromise: Promise<any>) => Promise<any>;
export type LazyLoadHandler = (parser: LazyLoadParser) => LazyLoadFactory | Promise<LazyLoadFactory>;

export interface ModuleDecoratorOptions {
    imports?: Array<Type>;
    providers?: Array<Type>;
    components?: Array<Type>;
    routes?: Array<RouteOptionItem>;
    exports?: Array<Type>;
}

export type ViewOptions<T = any> = Omit<ViewConfig<T>, 'provider'>;

export interface ViewItem {
    component: ReactComponent;
    options: ViewOptions;
    lazyLoad: boolean;
}

export type ReactComponent<Props = any> = React.FC<Props>;

export interface NavigateOptions {
    to: string;
    path?: string;
}

export interface RouteConfigItem extends ViewOptions {
    path: string;
    lazyLoad?: boolean;
    component: ReactComponent;
    sequence?: number;
    children?: RouteConfigItem[];
}

export type RouteConfig = RouteConfigItem[];

export interface AppProps {
    module: Type;
    routerProps?: any;
    RouterComponent?: React.FC;
}

export interface ViewConfig<T = any> extends Omit<RouteProps, 'element' | 'children'> {
    provider: Type<AbstractComponent> | LazyLoadHandler;
    id: string;
    parent?: string;
    priority?: number;
    elementProps?: T;
    suspenseFallback?: boolean | React.ReactChild | React.ReactFragment | React.ReactPortal | null;
};

export interface RouteOptionItem<T = any> extends Omit<RouteProps, 'element' | 'children'> {
    useModuleClass?: Type;
    useComponentClass?: Type;
    children?: RouteOptionItem<T>[];
}

export interface ModuleInstanceMetadata {
    Class: Type<any>;
    imports: Set<Type<any>>;
    isGlobal: boolean;
    providers: Set<Type<any>>;
    exports: Set<Type<any>>;
    components: Set<Type<any>>;
    routes: Set<RouteOptionItem>;
}

export interface ModuleMetadata {
    imports: Set<Type>;
    providers: Set<Type>;
    exports: Set<Type>;
    components: Set<Type>;
    routes: Set<RouteOptionItem>;
}

export interface ComponentDecoratorOptions<T = any> {
    component: React.FC;
    declarations?: Type[];
    elementProps?: T;
    suspenseFallback?: boolean | React.ReactChild | React.ReactFragment | React.ReactPortal | null;
}

export type ComponentMetadata = Omit<ComponentDecoratorOptions, 'declarations'>;

export interface ComponentInstanceMetadata extends ComponentMetadata {
    Class: Type;
}

export interface RouterItem extends Omit<RouteOptionItem, 'useModuleClass' | 'useComponentClass' | 'children'> {
    componentInstance: ComponentInstance;
    children?: RouterItem[];
}
