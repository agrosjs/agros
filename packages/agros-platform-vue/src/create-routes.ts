import 'reflect-metadata';
import {
    RouterItem,
    // Type,
} from '@agros/common/lib/types';
import { defineAsyncComponent } from 'vue';
// import { DI_METADATA_USE_INTERCEPTORS_SYMBOL } from '@agros/common/lib/constants';

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
            // interceptorsFallback,
        } = componentInstance.metadata;
        // const interceptorClasses: Type[] = Reflect.getMetadata(
        //     DI_METADATA_USE_INTERCEPTORS_SYMBOL,
        //     componentInstance.metadata.Class,
        // ) || [];

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
