import {
    Module,
    RouterModule,
} from '@agros/common';
import { AppComponent } from './app.component';
import { BarModule } from './modules/bar/bar.module';
import { BazModule } from './modules/baz/baz.module';
import { LoremModule } from './modules/lorem/lorem.module';

const FooModule = import('./modules/foo/foo.module').then((({ FooModule }) => FooModule));

@Module({
    components: [
        AppComponent,
    ],
    imports: [
        FooModule,
        BarModule,
        BazModule,
        LoremModule,
        RouterModule.register({
            routes: [
                {
                    path: '',
                    useComponentClass: AppComponent,
                    children: [
                        {
                            useModuleClass: FooModule,
                        },
                        {
                            useModuleClass: LoremModule,
                        },
                    ],
                },
            ],
        }),
    ],
    exports: [
        AppComponent,
    ],
})
export class AppModule {}
