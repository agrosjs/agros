import {
    lazy,
    Component,
} from '@agros/app';

@Component({
    suspenseFallback: 'loading...',
    factory: (forwardRef) => lazy(() => forwardRef(import('./FooChild'))),
})
export class FooChildComponent {}
