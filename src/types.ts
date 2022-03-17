import React from 'react';
import { AbstractComponent } from './classes';

export type Type<T = any> = new (...args: Array<any>) => T;

export interface ModuleDecoratorOptions {
    imports?: Array<any>;
    providers?: Array<any>;
    views?: Array<any>;
}

export interface ViewMetadata {
    options: ViewDecoratorOptions;
    dependencies: any[];
}

export interface ViewDecoratorOptions {
    pathname: string;
    name?: string;
    extra?: any;
    navigateTo?: string;
    parent?: Type<AbstractComponent>;
}

export interface ViewItem {
    clazz: Type<AbstractComponent>;
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
    children?: RouteConfigItem[];
}

export type RouteConfig = RouteConfigItem[];

export type AsyncModule = Promise<any>;

export interface RouterContainerProps<M = any> {
    module: Type<M>;
}
