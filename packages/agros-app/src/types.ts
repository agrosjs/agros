import React from 'react';
import {
    Location,
    RouteProps,
    useSearchParams,
    useParams,
} from 'react-router-dom';

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

export interface Container {
    get: <T>(ProviderClass: Type) => T;
}

export interface ContainerForwardedComponentProps<Props> {
    props: Props;
    container: Container;
}

export interface InterceptorContext {
    route: {
        location: Location;
        params: ReturnType<typeof useParams>;
        searchParams: ReturnType<typeof useSearchParams>;
    };
}

export type UseInterceptorsDecoratorOptions = Type[];
