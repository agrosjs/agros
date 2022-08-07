import { Module } from '@agros/app';
import { BarModule } from '../bar/bar.module';
import { FooChildComponent } from './foo-child.component';
import { FooComponent } from './foo.component';
import { FooInterceptor } from './foo.interceptor';
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
        FooInterceptor,
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
