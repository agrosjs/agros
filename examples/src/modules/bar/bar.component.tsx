import { FunctionComponent } from 'react';
import {
    AbstractComponent,
    Injectable,
} from '../../../../lib';

@Injectable()
export class BarComponent extends AbstractComponent implements AbstractComponent {
    protected async generateComponent(): Promise<FunctionComponent<any>> {
        return () => <pre>Greet from BarComponent</pre>;
    }
}
