import { Component } from '@agros/app';

@Component({
    file: './FooBoundary',
    styles: [
        './foo-boundary.component.less',
        '@modules/foo/foo.test.less',
    ],
    boundary: {
        fallback: <pre>ERROR CAUGHT</pre>,
    },
})
export class FooBoundaryComponent {}
