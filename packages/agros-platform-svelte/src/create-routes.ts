import { RouterItem } from '@agros/tools';

export const createRoutes = (routerItems: RouterItem[], level = 0) => {
    return routerItems.map((routerItem) => {
        const {
            componentInstance,
            children,
            ...routeProps
        } = routerItem;
        const component = componentInstance.getComponent();

        return {
            path: routeProps.path,
            component,
            ...(
                (Array.isArray(children) && children.length > 0)
                    ? {
                        children: createRoutes(children, level + 1) || [],
                    }
                    : {}
            ),
        };
    });
};
