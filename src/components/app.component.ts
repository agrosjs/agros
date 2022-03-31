import React from 'react';
import {
    AppProps,
} from '../types';
import { useRoutes } from '../hooks';
import {
    Routes,
    HashRouter,
} from 'react-router-dom';

export const App: React.FC<AppProps> = ({
    module: Module,
    routerProps = {},
    RouterComponent = HashRouter,
}) => {
    const elements = useRoutes(Module);

    return React.createElement(
        RouterComponent,
        routerProps,
        React.createElement(Routes, {}, elements),
    );
};
