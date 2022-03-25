import React, {
    Suspense,
    SuspenseProps,
    useState,
    useEffect,
} from 'react';
import { Factory } from '../factory';
import {
    RouteConfig,
    RouterItem,
    Type,
} from '../types';
import {
    Route,
    RouteProps,
} from 'react-router-dom';

const createRoutes = (routerItems: RouterItem[], level = 0): React.ReactNode | React.ReactNode[] => {
    return routerItems.map((routerItem, index) => {
        const {
            componentInstance,
            children,
            ...routeProps
        } = routerItem;

        const {
            suspenseFallback = null,
            elementProps = {},
        } = componentInstance.metadata;

        const Component = componentInstance.getComponent();

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
    const [routerItems, setRouterItems] = useState<RouterItem[]>([]);
    const [elements, setElements] = useState<React.ReactNode>(null);

    useEffect(() => {
        const RootModule = Module;
        const factory = new Factory();
        factory.create<T>(RootModule).then((items) => {
            setRouterItems(items);
        });
    }, [Module]);

    useEffect(() => {
        const routeElements = createRoutes(routerItems);
        setElements(routeElements);
    }, [routerItems]);

    return elements;
};
