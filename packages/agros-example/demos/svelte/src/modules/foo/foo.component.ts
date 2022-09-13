import {
    Component,
    UseInterceptors,
} from '@agros/app';
import { BarComponent } from '../bar/bar.component';
import { BarService } from '../bar/bar.service';
import { FooInterceptor } from './foo.interceptor';
import { FooService } from './foo.service';

@Component({
    file: './Foo.svelte',
    lazy: true,
    declarations: [
        BarComponent,
        FooService,
        BarService,
    ],
})
@UseInterceptors(FooInterceptor)
export class FooComponent {}
