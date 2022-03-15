import React, { FunctionComponent } from 'react';
import {
    AbstractComponent,
    Injectable,
} from '../../../../lib';

@Injectable()
export class BarComponent extends AbstractComponent implements AbstractComponent {
    protected generateComponent(): FunctionComponent<any> {
        return () => <pre>Greet from BarComponent</pre>;
    }
}
