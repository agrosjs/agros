import { ReactComponent } from '../types';

export abstract class AbstractComponent {
    public getComponent<P = any>(): Promise<ReactComponent<P>> {
        return this.generateComponent();
    }

    protected abstract generateComponent<P>(): Promise<ReactComponent<P>>;
}
