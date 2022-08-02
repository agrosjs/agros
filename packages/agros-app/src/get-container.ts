import React from 'react';
import {
    DEPS_PROPERTY_NAME,
    Type,
} from '@agros/common';

/**
 * get container dependencies
 * @param {React.FC | React.Component} component
 * @returns {Object}
 */
export const getContainer = (component: React.FC | React.Component) => {
    const descriptor = Object.getOwnPropertyDescriptor(
        component,
        DEPS_PROPERTY_NAME,
    );
    let dependencyMap = descriptor.value || new Map();

    return {
        get: <T>(Class: Type) => dependencyMap.get(Class) as T,
    };
};
