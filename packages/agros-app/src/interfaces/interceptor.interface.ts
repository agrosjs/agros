import { InterceptorContext } from '../types';

export interface Interceptor<P = any, R = any> {
    intercept: (props: P, context: InterceptorContext) => Promise<R> | R;
}
