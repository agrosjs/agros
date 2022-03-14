export type Type<T = any> = new (...args: Array<any>) => T;

export class ModuleInstance {
    public constructor(
      public imports: Array<ModuleInstance>,
      public providers: Map<any, any>,
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
            throw new Error(`No provider named: ${ provider.name }`);
        }

        return instance;
    }
}
