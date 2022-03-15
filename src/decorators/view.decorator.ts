import 'reflect-metadata';
import {
    DI_VIEWS_SYMBOL,
} from '../constants';
import {
    ViewDecoratorOptions,
} from '../types';

export function View(options: ViewDecoratorOptions): ClassDecorator {
    return (target) => {
        Reflect.defineMetadata(
            DI_VIEWS_SYMBOL,
            options,
            target,
        );
    };
}
