import Agros, { Component } from '../../../../lib';
import {
    ErrorBoundary,
    ErrorBoundaryPropsWithFallback,
} from 'react-error-boundary';
import FooBoundary from './FooBoundary';

@Component({
    factory: () => FooBoundary,
    boundaryComponent: (props: Agros.PropsWithChildren<ErrorBoundaryPropsWithFallback>) => {
        return (
            <ErrorBoundary fallback={<pre>ERROR CAUGHT</pre>}>
                {props.children}
            </ErrorBoundary>
        );
    },
})
export class FooBoundaryComponent {}
