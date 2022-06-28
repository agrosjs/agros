import { Component } from '@agros/app';
import Bar from './Bar';

@Component({
    suspenseFallback: 'loading...',
    factory: () => Bar,
})
export class BarComponent {}
