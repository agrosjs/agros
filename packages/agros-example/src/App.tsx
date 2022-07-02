import { Outlet } from '@agros/app/lib/router';
import './app.component.css';

export default () => {
    return (
        <div className="app">
            <nav>Agros</nav>
            <div className="container">
                <Outlet />
            </div>
        </div>
    );
};
