import { Outlet } from '@agros/app/lib/router';

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
