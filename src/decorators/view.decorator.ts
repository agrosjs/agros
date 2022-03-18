import {
    DI_VIEWS_SYMBOL,
} from '../constants';
import {
    ViewDecoratorOptions,
    ViewMetadata,
} from '../types';

export function View<T>(options: ViewDecoratorOptions<T>): ClassDecorator {
    return (target) => {
        const metadataValue: ViewMetadata = {
            options,
            dependencies: Reflect.getMetadata('design:paramtypes', target) || [],
        };

        Reflect.defineMetadata(
            DI_VIEWS_SYMBOL,
            metadataValue,
            target,
        );
    };
}
