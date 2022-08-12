import { UseInterceptorsDecoratorOptions } from '@agros/common/lib/types';
import { DI_METADATA_USE_INTERCEPTORS_SYMBOL } from '@agros/common/lib/constants';

export function UseInterceptors(...interceptors: UseInterceptorsDecoratorOptions): ClassDecorator {
    return (target) => {
        Reflect.defineMetadata(
            DI_METADATA_USE_INTERCEPTORS_SYMBOL,
            interceptors || [],
            target,
        );
    };
}
