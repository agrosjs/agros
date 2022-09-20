import { Component } from '@agros/common';

@Component({
    suspenseFallback: 'loading...',
    file: './FooChild',
    lazy: true,
})
export class FooChildComponent {}
