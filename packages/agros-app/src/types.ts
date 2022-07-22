import React from 'react';
import {
    Location,
    RouteProps,
    useSearchParams,
    useParams,
} from 'react-router-dom';
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

export interface RootContainerProps {
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

export type FactoryForwardRef = <T = any>(promise: Promise<{ default: T }>) => Promise<{ default: T }>;

export interface ComponentDecoratorOptions<T = any> {
    file?: string;
    lazy?: boolean;
    styles?: string[];
    boundaryComponent?: React.FC<any>;
    declarations?: Type[];
    elementProps?: T;
    suspenseFallback?: boolean | React.ReactChild | React.ReactFragment | React.ReactPortal | null;
}

export type ComponentMetadata = Omit<ComponentDecoratorOptions, 'declarations' | 'file' | 'lazy'> & {
    factory?: (forwardRef: FactoryForwardRef) => React.FC | React.ExoticComponent;
};

export interface ComponentInstanceMetadata extends ComponentMetadata {
    Class: Type;
}

export interface RouterItem extends Omit<RouteOptionItem, 'useModuleClass' | 'useComponentClass' | 'children'> {
    componentInstance: ComponentInstance;
    children?: RouterItem[];
}

export interface Container {
    get: <T>(ProviderClass: Type) => T;
}

export interface ContainerForwardedComponentProps<Props> {
    props: Props;
    container: Container;
}

export interface BootstrapConfigItem extends RootContainerProps {
    container?: HTMLElement;
}

export interface InterceptorContext<T = any> {
    route: {
        location: Location;
        params: ReturnType<typeof useParams>;
        searchParams: ReturnType<typeof useSearchParams>;
    };
    upstream?: T;
}

export interface Interceptor<T = any, P = any, R = any> {
    intercept: (props: P, context: InterceptorContext<T>) => Promise<R> | R;
}

export type UseInterceptorsDecoratorOptions = Interceptor[];
