import { RouterItem } from '@agros/common/lib/types';
import { defineAsyncComponent } from 'vue';

export const createRoutes = (routerItems: RouterItem[], level = 0) => {
    return routerItems.map((routerItem) => {
        const {
            componentInstance,
            children,
            ...routeProps
        } = routerItem;
        const component = componentInstance.getComponent();
        const {
            lazy,
            suspenseFallback,
        } = componentInstance.metadata;

        return {
            path: routeProps.path,
            component: !lazy
                ? component
                : defineAsyncComponent({
                    loader: component,
                    loadingComponent: suspenseFallback,
                }),
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
