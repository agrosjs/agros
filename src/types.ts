import React from 'react';
import { RouteProps } from 'react-router-dom';
import { AbstractComponent } from './classes';

export type Type<T = any> = new (...args: Array<any>) => T;

export interface ModuleDecoratorOptions {
    imports?: Array<any>;
    providers?: Array<any>;
    views?: Array<any>;
}

export interface ViewMetadata {
    options: ViewDecoratorOptions;
    dependencies: Type[];
}

export interface ViewDecoratorOptions<T = any> extends Omit<RouteProps, 'element' | 'children'> {
    priority?: number;
    elementProps?: T;
    parent?: Type<AbstractComponent>;
}

export interface ViewItem {
    Class: Type<AbstractComponent>;
    instance: AbstractComponent;
    options: ViewDecoratorOptions;
}

export type ReactComponent<Props = any> = React.FC<Props>;

export interface NavigateOptions {
    to: string;
    path?: string;
}

export interface RouteConfigItem extends Omit<ViewDecoratorOptions, 'parent' | 'pathname'> {
    path: string;
    ViewClass: Type<AbstractComponent>;
    component: ReactComponent;
    sequence?: number;
    children?: RouteConfigItem[];
}

export type RouteConfig = RouteConfigItem[];

export type AsyncModule<T> = Promise<T>;

export interface RouterContainerProps<M = any> {
    module: Type<M>;
    RouterComponent?: React.FC;
}

export interface ModuleInstanceMetadata {
    Class: Type<any>;
    imports: Set<Type<any>>;
    isGlobal: boolean;
    providers: Set<Type<any>>;
    views: Set<Type<AbstractComponent>>;
}
