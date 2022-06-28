import {
    Component,
} from '@agros/app';
import { BarComponent } from '../bar/bar.component';
import { BarService } from '../bar/bar.service';
import { FooService } from './foo.service';

@Component({
    suspenseFallback: 'loading...',
    file: './Foo',
    lazy: true,
    declarations: [
        BarComponent,
        FooService,
        BarService,
    ],
})
export class FooComponent {}
