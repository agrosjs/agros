import {
    DI_METADATA_PARAM_BASE_PROVIDER_SYMBOL,
    SELF_DECLARED_DEPS_METADATA,
} from '../constants';

export function Inject<T = any>(token?: T) {
    return (target: object, key: string | symbol, index?: number) => {
        const type = token || Reflect.getMetadata('design:type', target, key);

        if (typeof index === 'number') {
            const dependencies = Array.from(Reflect.getMetadata(DI_METADATA_PARAM_BASE_PROVIDER_SYMBOL, target) || []);
            dependencies.splice(index, 0, {
                index,
                param: type,
            });
            Reflect.defineMetadata(DI_METADATA_PARAM_BASE_PROVIDER_SYMBOL, dependencies, target);
            return;
        }

        let properties = Reflect.getMetadata(SELF_DECLARED_DEPS_METADATA, target?.constructor) || [];

        properties = [
            ...properties,
            {
                key,
                type,
            },
        ];

        Reflect.defineMetadata(
            SELF_DECLARED_DEPS_METADATA,
            properties,
            target?.constructor,
        );
    };
}
