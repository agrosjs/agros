import { Outlet } from 'react-router-dom';
import {
    AbstractComponent,
    ReactComponent,
    View,
} from '../../lib';
import './app.view.css';

@View({
    path: '/',
})
export class AppView extends AbstractComponent implements AbstractComponent {
    protected generateComponent(): ReactComponent<any> {
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
