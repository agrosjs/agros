import {
    Module,
    RouterModule,
} from '@agros/common';
import { AppComponent } from './app.component';
import { BarModule } from './modules/bar/bar.module';
import { BazModule } from './modules/baz/baz.module';
import { LoremModule } from './modules/lorem/lorem.module';
import { FooModule } from './modules/foo/foo.module';

@Module({
    components: [
        AppComponent,
    ],
    imports: [
        RouterModule.forRoot({
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
        FooModule,
        BarModule,
        BazModule,
        LoremModule,
    ],
    exports: [
        AppComponent,
    ],
})
export class AppModule {}
