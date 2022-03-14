import { Type } from '../types';

export class ModuleInstance {
    public constructor(
      public imports: Array<ModuleInstance>,
      public providers: Map<any, any>,
      public views: Array<any> = [],
    ) {}

    public get<T>(provider: Type<T>) {
        let instance: T = this.providers.get(provider);

        if (!instance) {
            this.imports.some((imp) => {
                instance = imp.get(provider);
                return !!instance;
            });
        }

        if (!instance) {
            throw new Error(`No provider named: ${provider.name}`);
        }

        return instance;
    }
}
