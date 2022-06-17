import { Outlet } from '../../lib/router';
import './app.component.css';

export default () => {
    return (
        <div className="app">
            <nav>Khamsa</nav>
            <div className="container">
                <Outlet />
            </div>
        </div>
    );
};
