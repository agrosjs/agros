import { InterceptorContext } from '../types';

export interface Interceptor<T = any, P = any, R = any> {
    intercept: (props: P, context: InterceptorContext<T>) => Promise<R> | R;
}
