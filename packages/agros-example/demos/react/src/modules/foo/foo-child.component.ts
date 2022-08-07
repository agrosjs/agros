import { Component } from '@agros/app';

@Component({
    suspenseFallback: 'loading...',
    file: './FooChild',
    lazy: true,
})
export class FooChildComponent {}
