import { DI_DEPS_SYMBOL } from '@agros/common/lib/constants';

export function Injectable(): ClassDecorator {
    return (target) => {
        Reflect.defineMetadata(
            DI_DEPS_SYMBOL,
            Reflect.getMetadata('design:paramtypes', target) || [],
            target,
        );
    };
}
