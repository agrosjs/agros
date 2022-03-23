import {
    FunctionComponent,
} from 'react';
import {
    AbstractComponent,
    Injectable,
} from '../../../../lib';

@Injectable()
export class FooChildView extends AbstractComponent implements AbstractComponent {
    protected async generateComponent(): Promise<FunctionComponent<any>> {
        return () => {
            return (
                <div style={{ color: 'red' }}>Greet from foo/child page!</div>
            );
        };
    }
}
