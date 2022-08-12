import { Outlet } from '@agros/platform-react/lib/react-router-dom';

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
