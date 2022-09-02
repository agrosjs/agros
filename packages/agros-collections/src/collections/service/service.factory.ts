import * as path from 'path';
import {
    InjectableCollectionGenerateFactory,
    InjectableCollectionUpdateFactory,
} from '../injectable.factory';

export class ServiceCollectionGenerateFactory extends InjectableCollectionGenerateFactory {
    public constructor() {
        super(
            'service',
            path.resolve(__dirname, 'files/service.ts._'),
            '*.service.ts',
        );
    }
}

export class ServiceCollectionUpdateFactory extends InjectableCollectionUpdateFactory {
    public constructor() {
        super('service');
    }
}
