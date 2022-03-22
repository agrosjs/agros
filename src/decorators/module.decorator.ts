import { DI_METADATA_MODULE_SYMBOL } from '../constants';
import {
    ModuleDecoratorOptions,
    ModuleMetadata,
} from '../types';

export function Module(options: ModuleDecoratorOptions = {}): ClassDecorator {
    return (target) => {
        const {
            imports = [],
            providers = [],
            views = [],
            exports: exportedProviders = [],
        } = options;

        Reflect.defineMetadata(
            DI_METADATA_MODULE_SYMBOL,
            {
                imports: new Set(imports),
                providers: new Set(providers),
                views: new Set(views),
                exports: new Set(exportedProviders),
            } as ModuleMetadata,
            target,
        );
    };
}
