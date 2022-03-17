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

/**
 * {
 *      "path": "/foo",
 *      "children": [
 *          {
 *              "path": "/bar"
 *          }
 *      ],
 * }
 */
export interface RouteItem<T = any> {
    path: string;
    navigateTo?: string;
    name?: string;
    extra?: T;
    children?: RouteItem<T>[];
}

export type Routes<T = any> = RouteItem<T>[];

export interface RouteConfigItem<T = any> extends Omit<RouteItem<T>, 'children'> {
    ViewClass: Type<AbstractComponent>;
    component: ReactComponent;
    children?: RouteConfigItem[];
}

export type RouteConfig<T = any> = RouteConfigItem<T>[];

export type AsyncModule = Promise<any>;

export interface RouterContainerProps<T = any, M = any> {
    module: Type<M>;
}
