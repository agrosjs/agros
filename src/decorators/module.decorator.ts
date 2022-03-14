import {
    DI_IMPORTS_SYMBOL,
    DI_PROVIDERS_SYMBOL,
} from '../constants';

export function Module(options: { imports?: Array<any>, providers?: Array<any> }): ClassDecorator {
    return (target) => {
        Reflect.defineMetadata(DI_IMPORTS_SYMBOL, new Set(options.imports || []), target);
        Reflect.defineMetadata(DI_PROVIDERS_SYMBOL, new Set(options.providers || []), target);
    };
}
