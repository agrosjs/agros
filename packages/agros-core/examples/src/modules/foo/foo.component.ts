import {
    lazy,
    Component,
} from '../../../../lib';
import { BarComponent } from '../bar/bar.component';
import { BarService } from '../bar/bar.service';
import { FooService } from './foo.service';

@Component({
    suspenseFallback: 'loading...',
    factory: (forwardRef) => {
        return lazy(() => forwardRef(import('./Foo')));
    },
    declarations: [
        BarComponent,
        FooService,
        BarService,
    ],
})
export class FooComponent {}
