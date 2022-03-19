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
    RouterComponent = BrowserRouter,
}) => {
    const elements = useRoutes(Module);
    return React.createElement(
        RouterComponent,
        {},
        React.createElement(Routes, {}, elements),
    );
};
