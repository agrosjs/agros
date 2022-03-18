import {
    FunctionComponent,
} from 'react';
import {
    AbstractComponent,
    View,
} from '../../../../lib';
import { FooView } from './foo.view';

@View({
    path: '/child',
    parent: FooView,
})
export class FooChildView extends AbstractComponent implements AbstractComponent {
    protected generateComponent(): FunctionComponent<any> {
        return () => {
            return (
                <div style={{ color: 'red' }}>Greet from foo/child page!</div>
            );
        };
    }
}
