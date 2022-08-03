import {
    createElement,
    Suspense,
} from 'react';
import { Route } from 'react-router-dom';
import { RouterItem } from '@agros/common/lib/types';

export const createRoutes = (routerItems: RouterItem[], level = 0) => {
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

        const createAppRouterElement = (Component) => {
            return createElement(
                Suspense,
                {
                    fallback: suspenseFallback,
                },
                createElement(Component, elementProps),
            );
        };

        return createElement(
            Route,
            {
                key: `level${level}_${index}`,
                ...routeProps,
                ...(
                    Component
                        ? {
                            element: createAppRouterElement(Component),
                        }
                        : {}
                ),
            },
            (Array.isArray(children) && children.length > 0) ? createRoutes(children, level + 1) : [],
        );
    });
};
