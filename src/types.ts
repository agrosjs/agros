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
}

export interface ViewItem {
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
    component: ReactComponent;
    children?: RouteConfigItem[];
}

export type RouteConfig<T = any> = RouteConfigItem<T>[];

export type AsyncModule = Promise<any>;

export interface RouterContainerProps<T = any, M = any> {
    routes: Routes<T>;
    module: Type<M>;
}
