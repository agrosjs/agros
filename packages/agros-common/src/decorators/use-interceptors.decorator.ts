import 'reflect-metadata';
import { UseInterceptorsDecoratorOptions } from '@agros/tools';
import { DI_METADATA_USE_INTERCEPTORS_SYMBOL } from '../constants';

export function UseInterceptors(...interceptors: UseInterceptorsDecoratorOptions): ClassDecorator {
    return (target) => {
        Reflect.defineMetadata(
            DI_METADATA_USE_INTERCEPTORS_SYMBOL,
            interceptors || [],
            target,
        );
    };
}
