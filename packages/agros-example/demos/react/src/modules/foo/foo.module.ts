import {
    Module,
    RouterModule,
} from '@agros/common';
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
        RouterModule.forFeature({
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
        }),
    ],
    providers: [
        FooService,
        FooInterceptor,
    ],
    exports: [
        FooService,
        FooComponent,
        FooChildComponent,
    ],
})
export class FooModule {}
