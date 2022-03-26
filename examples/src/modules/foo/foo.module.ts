import { Module } from '../../../../lib';
import { BarModule } from '../bar/bar.module';
import { FooChildComponent } from './foo-child.component';
import { FooComponent } from './foo.component';
import { FooService } from './foo.service';

@Module({
    components: [
        FooComponent,
        FooChildComponent,
    ],
    imports: [
        BarModule,
    ],
    providers: [
        FooService,
    ],
    routes: [
        {
            path: 'foo',
            useComponentClass: FooComponent,
            children: [
                {
                    path: 'child',
                    useComponentClass: FooChildComponent,
                },
            ],
        },
    ],
    exports: [
        FooService,
        FooComponent,
        FooChildComponent,
    ],
})
export class FooModule {}
