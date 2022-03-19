import {
    FunctionComponent,
} from 'react';
import {
    AbstractComponent,
    View,
} from '../../lib';
import { Navigate } from 'react-router-dom';

@View({
    path: '*',
})
export class AppNavigateView extends AbstractComponent implements AbstractComponent {
    protected generateComponent(): FunctionComponent<any> {
        return () => {
            return (
                <Navigate to="/app/foo/child" />
            );
        };
    }
}
