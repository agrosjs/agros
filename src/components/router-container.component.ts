import React from 'react';
import {
    RouterContainerProps,
} from '../types';
import { useRoutes } from '../hooks';
import { Routes } from 'react-router-dom';

export const RouterContainer: React.FC<RouterContainerProps> = ({
    routes = [],
    module: Module,
}) => {
    const elements = useRoutes(Module, routes);
    return React.createElement(Routes, {}, elements);
};
