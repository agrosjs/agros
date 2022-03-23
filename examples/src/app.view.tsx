import { Outlet } from 'react-router-dom';
import {
    AbstractComponent,
    Injectable,
    ReactComponent,
} from '../../lib';
import './app.view.css';

@Injectable()
export class AppView extends AbstractComponent implements AbstractComponent {
    protected async generateComponent(): Promise<ReactComponent<any>> {
        return () => {
            return (
                <div className="app">
                    <nav>Khamsa</nav>
                    <div className="container">
                        <Outlet />
                    </div>
                </div>
            );
        };
    }
}
