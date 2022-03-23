import {
    FunctionComponent,
} from 'react';
import {
    AbstractComponent,
    Injectable,
} from '../../lib';
import { Navigate } from 'react-router-dom';

@Injectable()
export class AppNavigateView extends AbstractComponent implements AbstractComponent {
    protected async generateComponent(): Promise<FunctionComponent<any>> {
        return () => {
            return (
                <Navigate to="/app/foo/child" />
            );
        };
    }
}
