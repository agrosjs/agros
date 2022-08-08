import { DEPS_PROPERTY_NAME } from './constants';

export const defineContainer = (objectInstance: Object, value: any) => {
    if (!Object.getOwnPropertyDescriptor(objectInstance, DEPS_PROPERTY_NAME)) {
        Object.defineProperty(
            objectInstance,
            DEPS_PROPERTY_NAME,
            {
                configurable: false,
                writable: false,
                enumerable: false,
                value,
            },
        );
    }
};
