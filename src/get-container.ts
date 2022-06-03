import React from 'react';
import { DEPS_PROPERTY_NAME } from './constants';
import { Type } from './types';

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
