import React from 'react';
import {
    RouterContainerProps,
} from '../types';
import { useRoutes } from '../hooks';
import { Routes } from 'react-router-dom';

export const RouterContainer: React.FC<RouterContainerProps> = ({
    module: Module,
}) => {
    const elements = useRoutes(Module);
    return React.createElement(Routes, {}, elements);
};
