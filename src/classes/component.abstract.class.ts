import { ReactComponent } from '../types';

export abstract class AbstractComponent {
    public getComponent<Props = any>(): ReactComponent<Props> {
        return this.generateComponent();
    }

    protected abstract generateComponent(): ReactComponent<any>;
}
