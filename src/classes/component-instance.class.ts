import React from 'react';
import { ComponentInstanceMetadata } from '../types';

export class ComponentInstance {
    private Component: React.FC;

    public constructor(
        public readonly metadata: ComponentInstanceMetadata,
    ) {}

    public setComponent<T = any>(Component: React.FC<T>) {
        this.Component = Component;
    }

    public getComponent<T = any>() {
        return this.Component as React.FC<T>;
    }
}
