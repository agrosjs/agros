import React from 'react';
import { Navigate } from 'react-router-dom';

export default () => {
    return (
        <Navigate to="/app/foo/child" />
    );
};
