import { AbstractView } from './classes';

export type Type<T = any> = new (...args: Array<any>) => T;

export interface ModuleDecoratorOptions {
    imports?: Array<any>;
    providers?: Array<any>;
    views?: Array<any>;
}

export interface ViewDecoratorOptions {
    pathname: string;
}

export interface ViewMetadata {
    options: ViewDecoratorOptions;
    dependencies: any[];
}

export interface ViewItem {
    instance: AbstractView;
    options: ViewDecoratorOptions;
}
