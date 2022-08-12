import { Component } from '@agros/app';

@Component({
    suspenseFallback: 'loading...',
    file: './FooChild.vue',
    lazy: true,
})
export class FooChildComponent {}
