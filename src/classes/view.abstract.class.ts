import React from 'react';

type ReactComponent<Props = any> = React.FC<Props>;

export abstract class AbstractView {
    public getView<Props = any>(): ReactComponent<Props> {
        return this.withServices(this.generateView());
    }

    protected withServices<C = any, N = any>(component: ReactComponent<C>): ReactComponent<C & N> {
        return (props: C & N) => {
            return React.createElement(component, props);
        };
    }

    protected abstract generateView(): ReactComponent<any>;
}
