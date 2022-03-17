import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import reportWebVitals from './reportWebVitals';
import {
    Routes,
    RouterContainer,
} from '../../lib';
import { FooModule } from './modules/foo/foo.module';
import {
    HashRouter as Router,
} from 'react-router-dom';

const routes: Routes = [
    {
        path: '/foo',
    },
    {
        path: '*',
        navigateTo: '/foo',
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
    return (
        <>
            It's working!
            <Router>
                <RouterContainer routes={routes} module={RootModule} />
            </Router>
        </>
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
