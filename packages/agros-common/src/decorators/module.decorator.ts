import 'reflect-metadata';
import {
    ModuleDecoratorOptions,
    ModuleMetadata,
} from '@agros/tools';
import { DI_METADATA_MODULE_SYMBOL } from '../constants';

export function Module(options: ModuleDecoratorOptions = {}): ClassDecorator {
    return (target) => {
        const {
            imports = [],
            providers = [],
            components = [],
            exports: exportedProviders = [],
        } = options;

        Reflect.defineMetadata(
            DI_METADATA_MODULE_SYMBOL,
            {
                imports: new Set(imports),
                providers: new Set(providers),
                components: new Set(components),
                exports: new Set(exportedProviders),
            } as ModuleMetadata,
            target,
        );
    };
}
