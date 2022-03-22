import React, {
    Suspense,
    SuspenseProps,
    useState,
    useEffect,
} from 'react';
import { Factory } from '../factory';
import {
    RouteConfig,
    Type,
} from '../types';
import {
    Route,
    RouteProps,
} from 'react-router-dom';

const createRoutes = (routeConfig: RouteConfig, level = 0): React.ReactNode | React.ReactNode[] => {
    return routeConfig.map((routeConfigItem, index) => {
        const {
            elementProps = {},
            children,
            component: Component,
            suspenseFallback = null,
            ...routeProps
        } = routeConfigItem;

        return React.createElement(
            Route,
            {
                key: `level${level}_${index}`,
                ...routeProps,
                ...(
                    Component
                        ? {
                            element: React.createElement(
                                Suspense,
                                {
                                    fallback: suspenseFallback,
                                } as SuspenseProps,
                                React.createElement(Component, elementProps),
                            ),
                        }
                        : {}
                ),
            } as RouteProps,
            (Array.isArray(children) && children.length > 0)
                ? createRoutes(children, level + 1)
                : [],
        );
    });
};

export const useRoutes = <T>(Module: Type): React.ReactNode => {
    const [routeConfig, setRouteConfig] = useState<RouteConfig>([]);
    const [elements, setElements] = useState<React.ReactNode>(null);

    useEffect(() => {
        const RootModule = Module;
        const factory = new Factory();
        factory.create<T>(RootModule).then((config) => {
            setRouteConfig(config);
        });
    }, [Module]);

    useEffect(() => {
        const routeElements = createRoutes(routeConfig);
        setElements(routeElements);
    }, [routeConfig]);

    return elements;
};
