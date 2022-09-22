import { Type } from '@agros/tools';
import { Map as ImmutableMap } from 'immutable';

/**
 * get container dependencies
 * @param {ImmutableMap} map
 * @returns {Object}
 */
export const getContainer = (map: ImmutableMap<Type<any>, any> = ImmutableMap()) => {
    return {
        get: <T>(Class: Type) => map.get(Class) as T,
    };
};
