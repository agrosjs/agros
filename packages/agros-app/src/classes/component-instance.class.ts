import React from 'react';
import { ComponentInstanceMetadata } from '../types';

/**
 * @class
 * a class for storing metadata and methods
 */
export class ComponentInstance {
    /**
     * @private
     * @property
     * the React component for current component instance
     */
    private Component: React.FC;

    /**
     * @constructor
     * @param {ComponentInstanceMetadata} metadata
     */
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
