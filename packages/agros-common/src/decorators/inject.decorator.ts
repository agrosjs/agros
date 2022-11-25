import {
    DI_DEPS_SYMBOL,
    SELF_DECLARED_DEPS_METADATA,
} from '../constants';

export function Inject<T = any>(token?: T) {
    return (target: object, key: string | symbol, index?: number) => {
        const type = token || Reflect.getMetadata('design:type', target, key);

        if (typeof index === 'number') {
            let dependencies = Reflect.getMetadata(DI_DEPS_SYMBOL, target) || [];
            dependencies = [
                ...dependencies,
                {
                    index,
                    param: type,
                },
            ];
            Reflect.defineMetadata(DI_DEPS_SYMBOL, dependencies, target);
            return;
        }

        let properties = Reflect.getMetadata(SELF_DECLARED_DEPS_METADATA, target) || [];

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
            target,
        );
    };
}
