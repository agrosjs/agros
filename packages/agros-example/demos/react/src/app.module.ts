import { Module } from '@agros/app';
import { AppNavigateComponent } from './app-navigate.component';
import { AppComponent } from './app.component';
import { BarModule } from './modules/bar/bar.module';
import { BazModule } from './modules/baz/baz.module';
import { LoremModule } from './modules/lorem/lorem.module';

const FooModule = import('./modules/foo/foo.module').then((({ FooModule }) => FooModule));

@Module({
    components: [
        AppComponent,
        AppNavigateComponent,
    ],
    imports: [
        FooModule,
        BarModule,
        BazModule,
        LoremModule,
    ],
    routes: [
        {
            path: 'app',
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
        {
            path: '*',
            useComponentClass: AppNavigateComponent,
        },
    ],
    exports: [
        AppComponent,
        AppNavigateComponent,
    ],
})
export class AppModule {}
