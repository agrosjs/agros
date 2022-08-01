export interface Interceptor<P = any, C = any, R = any> {
    intercept: (props: P, context: C) => Promise<R> | R;
}
