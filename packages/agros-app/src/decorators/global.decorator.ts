import { DI_GLOBAL_MODULE_SYMBOL } from '@agros/common/lib/constants';

export function Global(): ClassDecorator {
    return (target) => {
        Reflect.defineMetadata(DI_GLOBAL_MODULE_SYMBOL, true, target);
    };
}
