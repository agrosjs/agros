import React from 'react';
import { Outlet } from 'react-router-dom';
import './app.component.css';

export default () => {
    return (
        <div className="app">
            <nav>Khamsa</nav>
            <div className="container">
                <Outlet />
            </div>
        </div>
    );
};
