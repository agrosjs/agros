import {
    Injectable,
    Interceptor,
} from '@agros/app';

@Injectable()
export class FooInterceptor implements Interceptor {
    public intercept() {
        console.log('THIS IS INTERCEPTOR');
        return;
    }
}
