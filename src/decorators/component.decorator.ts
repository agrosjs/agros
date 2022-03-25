import {
    DI_DEPS_SYMBOL,
    DI_METADATA_COMPONENT_SYMBOL,
} from '../constants';
import { ComponentDecoratorOptions } from '../types';

export function Component({
    component,
    declarations = [],
}: ComponentDecoratorOptions): ClassDecorator {
    return (target) => {
        Reflect.defineMetadata(
            DI_METADATA_COMPONENT_SYMBOL,
            {
                component,
            },
            target,
        );
        Reflect.defineMetadata(DI_DEPS_SYMBOL, declarations, target);
    };
}
