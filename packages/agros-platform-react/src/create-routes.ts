import { RouterItem } from '@agros/tools';
import { createElement } from 'react';
import { Route } from 'react-router-dom';

export const createRoutes = (routerItems: RouterItem[], level = 0) => {
    return routerItems.map((routerItem, index) => {
        const {
            componentInstance,
            children,
            ...routeProps
        } = routerItem;
        const Component = componentInstance.getComponent();
        const { elementProps = {} } = componentInstance.metadata;

        return createElement(
            Route,
            {
                key: `level${level}_${index}`,
                ...routeProps,
                ...(
                    Component
                        ? {
                            element: createElement(Component, elementProps),
                        }
                        : {}
                ),
            },
            (Array.isArray(children) && children.length > 0) ? createRoutes(children, level + 1) : [],
        );
    });
};
