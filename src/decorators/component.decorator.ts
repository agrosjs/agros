import React from 'react';
import {
    DI_DEPS_SYMBOL,
    DI_METADATA_COMPONENT_SYMBOL,
} from '../constants';
import { ComponentDecoratorOptions } from '../types';

export function Component<T = any, P = any>({
    declarations = [],
    component,
    ...metadataValue
}: ComponentDecoratorOptions<T, P>): ClassDecorator {
    return (target) => {
        Reflect.defineMetadata(
            DI_METADATA_COMPONENT_SYMBOL,
            {
                component: component as React.FC<P>,
                ...metadataValue,
            },
            target,
        );
        Reflect.defineMetadata(DI_DEPS_SYMBOL, declarations, target);
    };
}
