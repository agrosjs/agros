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
export interface RouteItem {
    path: string;
    name?: string;
    children?: RouteItem[];
}

export type Routes = RouteItem[];

export interface RouteConfigItem extends RouteItem {
    component: ReactComponent;
}

export type RouteConfig = RouteConfigItem[];

export type AsyncModule = Promise<any>;
