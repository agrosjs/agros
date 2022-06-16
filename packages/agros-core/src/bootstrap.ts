import React from 'react';
import ReactDOM from 'react-dom';
import {
    Routes,
    BrowserRouter,
} from 'react-router-dom';
import {
    RootContainerProps,
    BootstrapConfigItem,
} from './types';
import { useRouteElements } from './hooks';

const RootContainer: React.FC<RootContainerProps> = ({
    module: Module,
    routerProps = {},
    RouterComponent = BrowserRouter,
}) => {
    const elements = useRouteElements(Module);

    return React.createElement(
        RouterComponent,
        routerProps,
        React.createElement(Routes, {}, elements),
    );
};

export const bootstrap = (configList: BootstrapConfigItem[]) => {
    if (!Array.isArray(configList)) {
        return;
    }

    for (const configItem of configList) {
        const {
            module: Module,
            RouterComponent,
            routerProps,
            container = document.getElementById('root'),
        } = configItem;

        ReactDOM.render(
            React.createElement(RootContainer, {
                module: Module,
                RouterComponent,
                routerProps,
            }),
            container,
        );
    }
};
