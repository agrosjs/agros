import React from 'react';
import { RouteProps } from 'react-router-dom';
import { AbstractComponent } from './classes';

export type Type<T = any> = new (...args: Array<any>) => T;

export interface ModuleDecoratorOptions {
    imports?: Array<Type>;
    providers?: Array<Type>;
    views?: Array<ViewConfig>;
    exports?: Array<Type>;
}

export interface ViewOptions<T = any> extends Omit<RouteProps, 'element' | 'children'> {
    priority?: number;
    elementProps?: T;
    suspenseFallback?: boolean | React.ReactChild | React.ReactFragment | React.ReactPortal | null;
}

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

export interface RouterContainerProps {
    module: Type;
    routerProps?: any;
    RouterComponent?: React.FC;
}

export interface ViewConfig<T = any> extends Omit<RouteProps, 'element' | 'children'> {
    provider: Type<AbstractComponent> | Promise<any>;
    priority?: number;
    elementProps?: T;
    suspenseFallback?: boolean | React.ReactChild | React.ReactFragment | React.ReactPortal | null;
};

export interface ModuleInstanceMetadata {
    Class: Type<any>;
    imports: Set<Type<any>>;
    isGlobal: boolean;
    providers: Set<Type<any>>;
    exports: Set<Type<any>>;
    views: Set<ViewConfig>;
}

export interface ModuleMetadata {
    imports: Set<Type>;
    providers: Set<Type>;
    exports: Set<Type>;
    views: Set<ViewConfig>;
}
