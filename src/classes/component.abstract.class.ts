import React from 'react';
import { InjectServices } from './inject-services.class';

type ReactComponent<Props = any> = React.FC<Props>;

export abstract class AbstractComponent extends InjectServices {
    public getComponent<Props = any>(): ReactComponent<Props> {
        const injectedServices = this.injectServices() || {};
        return this.generateComponent(injectedServices);
    }

    protected abstract generateComponent(injectedServices: Record<string, any>): ReactComponent<any>;
}
