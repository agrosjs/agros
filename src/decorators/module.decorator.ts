import {
    DI_EXPORTS_SYMBOL,
    DI_IMPORTS_SYMBOL,
    DI_PROVIDERS_SYMBOL,
    DI_VIEWS_SYMBOL,
} from '../constants';
import { ModuleDecoratorOptions } from '../types';

export function Module(options: ModuleDecoratorOptions = {}): ClassDecorator {
    return (target) => {
        Reflect.defineMetadata(DI_IMPORTS_SYMBOL, new Set(options.imports || []), target);
        Reflect.defineMetadata(DI_PROVIDERS_SYMBOL, new Set(options.providers || []), target);
        Reflect.defineMetadata(DI_VIEWS_SYMBOL, new Set(options.views || []), target);
        Reflect.defineMetadata(DI_EXPORTS_SYMBOL, new Set(options.exports || []), target);
    };
}
