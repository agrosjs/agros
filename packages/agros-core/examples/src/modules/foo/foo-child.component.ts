import React from 'react';
import { Component } from '../../../../lib';

@Component({
    suspenseFallback: 'loading...',
    component: React.lazy(() => import('./FooChild')),
})
export class FooChildComponent {}
