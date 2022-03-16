import React, {
    useEffect,
    useState,
} from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import reportWebVitals from './reportWebVitals';
import {
    Factory,
    RouteConfig,
    Routes,
} from '../../lib';
import { FooModule } from './modules/foo/foo.module';
import {
    HashRouter as Router,
    Routes as ReactRouterRoutes,
    Route,
} from 'react-router-dom';

const routes: Routes = [
    {
        path: '/foo',
    },
];

interface WrapperProps {
    routes: Routes;
    RootModule: any;
}

const Wrapper: React.FC<WrapperProps> = ({
    routes = [],
    RootModule,
}) => {
    const [routeConfig, setRouteConfig] = useState<RouteConfig>([]);

    useEffect(() => {
        const factory = new Factory();
        factory.create(RootModule, routes).then((config) => {
            setRouteConfig(config);
        });
    }, []);

    return (
        <Router>
            <ReactRouterRoutes>
                {
                    routeConfig.map((routeConfigItem) => {
                        const {
                            path,
                            component: RouteView,
                        } = routeConfigItem;

                        return <Route key={path} path={path} element={<RouteView />} />;
                    })
                }
            </ReactRouterRoutes>
        </Router>
    );
};

ReactDOM.render(
    <Wrapper routes={routes} RootModule={FooModule} />,
    document.getElementById('root'),
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
