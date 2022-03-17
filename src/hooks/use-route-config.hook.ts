import React, {
    useState,
    useEffect,
} from 'react';
import { Factory } from '../factory';
import {
    RouteConfig,
    Routes,
    Type,
} from '../types';
import {
    Navigate,
    NavigateProps,
    Route,
    RouteProps,
} from 'react-router-dom';

const createRoutes = (routeConfig: RouteConfig, level = 0): React.ReactNode[] => {
    return routeConfig.map((routeConfigItem, index) => {
        const {
            path,
            extra = {},
            children = [],
            navigateTo,
            component: Component,
        } = routeConfigItem;

        return React.createElement(
            Route,
            {
                path,
                key: `level${level}_${index}`,
                ...(
                    navigateTo
                        ? {
                            element: React.createElement(Navigate, { to: navigateTo } as NavigateProps),
                        }
                        : {}
                ),
                ...(
                    Component
                        ? {
                            element: React.createElement(Component, extra),
                        }
                        : {}
                ),
            } as RouteProps,
            ...(
                (children.length > 0 && !navigateTo)
                    ? createRoutes(children, level + 1)
                    : []
            ),
        );
    });
};

export const useRoutes = <T>(Module: Type, routes: Routes): React.ReactNode => {
    const [routeConfig, setRouteConfig] = useState<RouteConfig<T>>([]);
    const [elements, setElements] = useState<React.ReactNode>(null);

    useEffect(() => {
        const RootModule = Module;
        const factory = new Factory();
        factory.create(RootModule, routes).then((config) => {
            setRouteConfig(config);
        });
    }, [Module, routes]);

    useEffect(() => {
        const routeElements = createRoutes(routeConfig);
        setElements(routeElements);
    }, [routeConfig]);

    return elements;
};
