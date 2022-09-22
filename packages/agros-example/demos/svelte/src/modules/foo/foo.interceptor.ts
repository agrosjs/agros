import {
    Injectable,
    Interceptor,
} from '@agros/common';

@Injectable()
export class FooInterceptor implements Interceptor {
    public intercept(): undefined {
        console.log('THIS IS INTERCEPTOR');
        return;
    }
}
