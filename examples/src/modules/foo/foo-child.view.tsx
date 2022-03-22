import {
    FunctionComponent,
} from 'react';
import {
    AbstractComponent,
    View,
} from '../../../../lib';

@View({
    path: '/app/foo/child',
})
export class FooChildView extends AbstractComponent implements AbstractComponent {
    protected async generateComponent(): Promise<FunctionComponent<any>> {
        return () => {
            return (
                <div style={{ color: 'red' }}>Greet from foo/child page!</div>
            );
        };
    }
}
