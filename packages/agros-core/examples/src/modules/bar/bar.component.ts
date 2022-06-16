import Agros, { Component } from '../../../../lib';
import Bar from './Bar';

@Component<any, Agros.PropsWithChildren<{ used: string }>>({
    suspenseFallback: 'loading...',
    factory: () => Bar,
})
export class BarComponent {}
