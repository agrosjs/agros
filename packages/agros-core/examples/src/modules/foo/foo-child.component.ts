import Agros, { Component } from '../../../../lib';

@Component({
    suspenseFallback: 'loading...',
    factory: (forwardRef) => Agros.lazy(() => forwardRef(import('./FooChild'))),
})
export class FooChildComponent {}
