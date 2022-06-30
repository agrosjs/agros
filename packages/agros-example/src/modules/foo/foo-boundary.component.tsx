import { Component } from '@agros/app';
import { PropsWithChildren } from 'react';
import {
    ErrorBoundary,
    ErrorBoundaryPropsWithFallback,
} from 'react-error-boundary';

@Component({
    file: './FooBoundary',
    styles: [
        './foo-boundary.component.less',
        '@modules/foo/foo.test.less',
    ],
    boundaryComponent: (props: PropsWithChildren<ErrorBoundaryPropsWithFallback>) => {
        return (
            <ErrorBoundary fallback={<pre>ERROR CAUGHT</pre>}>
                {props.children}
            </ErrorBoundary>
        );
    },
})
export class FooBoundaryComponent {}
