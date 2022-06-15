import React, { PropsWithChildren } from 'react';
import { Component } from '../../../../lib';
import {
    ErrorBoundary,
    ErrorBoundaryPropsWithFallback,
} from 'react-error-boundary';
import FooBoundary from './FooBoundary';

@Component({
    component: FooBoundary,
    boundaryComponent: (props: PropsWithChildren<ErrorBoundaryPropsWithFallback>) => {
        return (
            <ErrorBoundary fallback={<pre>ERROR CAUGHT</pre>}>
                {props.children}
            </ErrorBoundary>
        );
    },
})
export class FooBoundaryComponent {}
