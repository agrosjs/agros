import { Component } from '@agros/common';

@Component({
    suspenseFallback: 'loading...',
    file: './FooChild.vue',
    lazy: true,
})
export class FooChildComponent {}
