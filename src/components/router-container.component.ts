import React from 'react';
import {
    RouterContainerProps,
} from '../types';
import { useRoutes } from '../hooks';
import {
    Routes,
    BrowserRouter,
} from 'react-router-dom';

export const RouterContainer: React.FC<RouterContainerProps> = ({
    module: Module,
    routerProps = {},
    RouterComponent = BrowserRouter,
}) => {
    const elements = useRoutes(Module);
    return React.createElement(
        RouterComponent,
        routerProps,
        React.createElement(Routes, {}, elements),
    );
};
