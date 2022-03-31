import React from 'react';
import {
    AppProps,
} from '../types';
import { useRouteElements } from '../hooks';
import {
    Routes,
    HashRouter,
} from 'react-router-dom';

export const App: React.FC<AppProps> = ({
    module: Module,
    routerProps = {},
    RouterComponent = HashRouter,
}) => {
    const elements = useRouteElements(Module);

    return React.createElement(
        RouterComponent,
        routerProps,
        React.createElement(Routes, {}, elements),
    );
};
