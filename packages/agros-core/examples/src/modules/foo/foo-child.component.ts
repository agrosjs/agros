import {
    lazy,
    Component,
} from '../../../../lib';

@Component({
    suspenseFallback: 'loading...',
    factory: (forwardRef) => lazy(() => forwardRef(import('./FooChild'))),
})
export class FooChildComponent {}
