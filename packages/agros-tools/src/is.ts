export const isClass = (obj: any) => {
    const isCtorClass = obj.constructor && obj.constructor.toString().substring(0, 5) === 'class';
    if (obj.prototype === undefined) {
        return isCtorClass;
    }
    const isPrototypeCtorClass = obj?.prototype?.constructor.toString && obj.prototype.constructor.toString().substring(0, 5) === 'class';
    return isCtorClass || isPrototypeCtorClass;
};

export const isDynamicModule = (object: any) => {
    return Boolean(object.module);
};

export const isBasicProvider = (object: any) => Boolean(object.provide) && (typeof object.provide === 'string' || typeof object.provide === 'symbol');

export const isValueProvider = (object: any) => {
    return object.useValue && isBasicProvider(object);
};

export const isFactoryProvider = (object: any) => {
    return typeof object.useFactory === 'function' && isBasicProvider(object);
};
