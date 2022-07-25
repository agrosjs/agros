import { DI_METADATA_USE_INTERCEPTORS_SYMBOL } from '../constants';
import { UseInterceptorsDecoratorOptions } from '../types';

export function UseInterceptors(...interceptors: UseInterceptorsDecoratorOptions): ClassDecorator {
    return (target) => {
        Reflect.defineMetadata(
            DI_METADATA_USE_INTERCEPTORS_SYMBOL,
            interceptors || [],
            target,
        );
    };
}