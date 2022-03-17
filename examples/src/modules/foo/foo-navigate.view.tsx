import {
    FunctionComponent,
} from 'react';
import {
    AbstractComponent,
    View,
} from '../../../../lib';
import { Navigate } from 'react-router-dom';

@View({
    pathname: '*',
})
export class FooNavigateView extends AbstractComponent implements AbstractComponent {
    protected generateComponent(): FunctionComponent<any> {
        return () => {
            return (
                <Navigate to="/foo/child" />
            );
        };
    }
}
