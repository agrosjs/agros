import React, {
    ReactNode,
    Suspense,
    SuspenseProps,
    useState,
    useEffect,
} from 'react';
import { Factory } from '../factory';
import {
    RouterItem,
    Type,
} from '../types';
import {
    Route,
    RouteProps,
} from 'react-router-dom';

/**
 * create routes from router items
 * @param {RouterItem[]} routerItems router items
 * @param {number} level current router level
 * @returns {ReactNode | ReactNode[]}
 */
const createRoutes = (routerItems: RouterItem[], level = 0): ReactNode | ReactNode[] => {
    return routerItems.map((routerItem, index) => {
        const {
            componentInstance,
            children,
            ...routeProps
        } = routerItem;

        const {
            boundaryComponent = null,
            suspenseFallback = null,
            elementProps = {},
        } = componentInstance.metadata;

        const Component = componentInstance.getComponent();

        const createElement = (Component: React.FC) => {
            return React.createElement(
                Suspense,
                {
                    fallback: suspenseFallback,
                } as SuspenseProps,
                React.createElement(Component, elementProps),
            );
        };

        return React.createElement(
            Route,
            {
                key: `level${level}_${index}`,
                ...routeProps,
                ...(
                    Component
                        ? {
                            element: boundaryComponent
                                ? React.createElement(
                                    boundaryComponent,
                                    {},
                                    createElement(Component),
                                )
                                : createElement(Component),
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

/**
 * pass a module class and create route elements
 * @param {Type} Module module class
 * @returns {ReactNode}
 */
export const useRouteElements = <T>(Module: Type): ReactNode => {
    const [routerItems, setRouterItems] = useState<RouterItem[]>([]);
    const [elements, setElements] = useState<ReactNode>(null);

    useEffect(() => {
        const RootModule = Module;
        const factory = new Factory();
        factory.create<T>(RootModule).then((items) => {
            setRouterItems(items);
        });
    }, [Module]);

    useEffect(() => {
        const elements = createRoutes(routerItems);
        setElements(elements);
    }, [routerItems]);

    return elements;
};
