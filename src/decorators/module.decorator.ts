import {
    DI_IMPORTS_SYMBOL,
    DI_PROVIDERS_SYMBOL,
} from '../constants';
import { Type } from '../types';

export function Module(options: { imports?: Array<any>, providers?: Array<any> }): ClassDecorator {
    return (target) => {
        Reflect.defineMetadata(DI_IMPORTS_SYMBOL, new Set(options.imports || []), target);
        Reflect.defineMetadata(DI_PROVIDERS_SYMBOL, new Set(options.providers || []), target);
    };
}

export class ModuleInstance {
    public constructor(
      public imports: Array<ModuleInstance>,
      public providers: Map<any, any>,
    ) {}

    public get<T>(provider: Type<T>) {
        let instance: T = this.providers.get(provider);
        if(!instance) {
            this.imports.some(imp => {
                instance = imp.get(provider);
                return !!instance;
            });
        }
        if(!instance) {
            throw new Error(`No provider named: ${ provider.name }`);
        }
        return instance;
    }
}
