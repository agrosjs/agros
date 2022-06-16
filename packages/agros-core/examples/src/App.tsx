import { router } from '../../lib';
import './app.component.css';

export default () => {
    return (
        <div className="app">
            <nav>Khamsa</nav>
            <div className="container">
                <router.Outlet />
            </div>
        </div>
    );
};
