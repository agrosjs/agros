import { Type } from '@agros/common/lib/types';
import { DEPS_PROPERTY_NAME } from '@agros/common/lib/constants';
import { Map as ImmutableMap } from 'immutable';

/**
 * get container dependencies
 * @param {any} component
 * @returns {Object}
 */
export const getContainer = (component: any) => {
    const descriptor = Object.getOwnPropertyDescriptor(
        component,
        DEPS_PROPERTY_NAME,
    );
    let dependencyMap = descriptor?.value || component[DEPS_PROPERTY_NAME] || ImmutableMap();

    return {
        get: <T>(Class: Type) => dependencyMap.get(Class) as T,
    };
};
