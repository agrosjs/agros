import {
    DI_VIEWS_SYMBOL,
} from '../constants';
import {
    ViewDecoratorOptions,
    ViewMetadata,
} from '../types';

export function View(options: ViewDecoratorOptions): ClassDecorator {
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
