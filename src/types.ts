import React from 'react';
import { RouteProps } from 'react-router-dom';
import { ComponentInstance } from './classes';

export type Type<T = any> = new (...args: Array<any>) => T;

export type AsyncModuleClass<T = any> = Type<T> | Promise<Type>;

export interface ModuleDecoratorOptions {
    imports?: Array<AsyncModuleClass>;
    providers?: Array<Type>;
    components?: Array<Type>;
    routes?: Array<RouteOptionItem>;
    exports?: Array<Type>;
}

export type ReactComponent<Props = any> = React.FC<Props>;

export interface NavigateOptions {
    to: string;
    path?: string;
}

export interface AppProps {
    module: Type;
    routerProps?: any;
    RouterComponent?: React.FC;
}

export interface RouteOptionItem<T = any> extends Omit<RouteProps, 'element' | 'children'> {
    useModuleClass?: AsyncModuleClass;
    useComponentClass?: Type;
    children?: RouteOptionItem<T>[];
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

export interface ComponentDecoratorOptions<T = any, P = any> {
    component: React.FC<P>;
    boundaryComponent?: React.FC<any>;
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

export type InjectedComponentProps<P = {}> = P & {
    declarations: {
        get: <T>(ProviderClass: Type) => T;
    };
};
