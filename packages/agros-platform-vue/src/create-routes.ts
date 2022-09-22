import {
    defineAsyncComponent,
    defineComponent,
} from 'vue';
import { RouterItem } from '@agros/tools';

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
            interceptorsFallback,
            interceptorInstances = [],
        } = componentInstance.metadata;

        let loadingComponent = interceptorsFallback || suspenseFallback;

        if (typeof loadingComponent === 'string') {
            loadingComponent = defineComponent({
                template: loadingComponent,
            });
        }

        return {
            path: routeProps.path,
            component: !lazy
                ? interceptorInstances.length === 0
                    ? component
                    : defineAsyncComponent({
                        loader: async () => {
                            for (const interceptorInstance of interceptorInstances) {
                                await interceptorInstance.intercept();
                            }
                            return component;
                        },
                    })
                : defineAsyncComponent({
                    loader: interceptorInstances.length === 0
                        ? component
                        : async () => {
                            for (const interceptorInstance of interceptorInstances) {
                                await interceptorInstance.intercept();
                            }
                            return component();
                        },
                    loadingComponent,
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
