import { ComponentInstanceMetadata } from './types';

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
    private Component: any;

    /**
     * @constructor
     * @param {ComponentInstanceMetadata} metadata
     */
    public constructor(
        public readonly metadata: ComponentInstanceMetadata,
    ) {}

    public setComponent(Component: any) {
        this.Component = Component;
    }

    public getComponent<T = any>(): T {
        return this.Component as T;
    }
}
