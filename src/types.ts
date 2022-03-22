import React from 'react';
import { RouteProps } from 'react-router-dom';
import { AbstractComponent } from './classes';

export type Type<T = any> = new (...args: Array<any>) => T;

export interface ModuleDecoratorOptions {
    imports?: Array<Type>;
    providers?: Array<Type>;
    views?: Array<ViewOrConfig>;
    exports?: Array<Type>;
}

export interface ViewMetadata {
    options: ViewDecoratorOptions;
    dependencies: Type[];
}

export interface ViewDecoratorOptions<T = any> extends Omit<RouteProps, 'element' | 'children'> {
    priority?: number;
    elementProps?: T;
    suspenseFallback?: boolean | React.ReactChild | React.ReactFragment | React.ReactPortal | null;
}

export interface ViewItem {
    component: ReactComponent;
    options: ViewDecoratorOptions;
    lazyLoad: boolean;
}

export type ReactComponent<Props = any> = React.FC<Props>;

export interface NavigateOptions {
    to: string;
    path?: string;
}

export interface RouteConfigItem extends Omit<ViewDecoratorOptions, 'parent' | 'pathname'> {
    path: string;
    lazyLoad?: boolean;
    component: ReactComponent;
    sequence?: number;
    children?: RouteConfigItem[];
}

export type RouteConfig = RouteConfigItem[];

export type AsyncModule<T> = Promise<T>;

export interface RouterContainerProps {
    module: Type;
    suspenseFallback?: boolean | React.ReactChild | React.ReactFragment | React.ReactPortal | null;
    routerProps?: any;
    RouterComponent?: React.FC;
}

export type ViewConfig = ViewDecoratorOptions & {
    view: Promise<any>;
};
export type ViewOrConfig = Type<AbstractComponent> | ViewConfig;

export interface ModuleInstanceMetadata {
    Class: Type<any>;
    imports: Set<Type<any>>;
    isGlobal: boolean;
    providers: Set<Type<any>>;
    exports: Set<Type<any>>;
    views: Set<ViewOrConfig>;
}

export interface ModuleMetadata {
    imports: Set<Type>;
    providers: Set<Type>;
    exports: Set<Type>;
    views: Set<ViewOrConfig>;
}
