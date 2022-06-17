import { PropsWithChildren } from 'react';
import { Component } from '../../../../lib';
import Bar from './Bar';

@Component<any, PropsWithChildren<{ used: string }>>({
    suspenseFallback: 'loading...',
    factory: () => Bar,
})
export class BarComponent {}
