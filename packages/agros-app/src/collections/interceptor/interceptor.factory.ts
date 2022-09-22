import * as path from 'path';
import {
    InjectableCollectionGenerateFactory,
    InjectableCollectionUpdateFactory,
} from '../injectable.factory';

export class InterceptorCollectionGenerateFactory extends InjectableCollectionGenerateFactory {
    public constructor() {
        super(
            'interceptor',
            path.resolve(__dirname, 'files/interceptor.ts._'),
            '*.interceptor.ts',
        );
    }
}

export class InterceptorCollectionUpdateFactory extends InjectableCollectionUpdateFactory {
    public constructor() {
        super('interceptor');
    }
}
