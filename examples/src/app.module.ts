import { Module } from '../../lib';
import { AppNavigateComponent } from './app-navigate.component';
import { AppComponent } from './app.component';
import { BarModule } from './modules/bar/bar.module';
import { BazModule } from './modules/baz/baz.module';

const AsyncFooModule = import('./modules/foo/foo.module').then((({ FooModule }) => FooModule));

@Module({
    components: [
        AppComponent,
        AppNavigateComponent,
    ],
    imports: [
        AsyncFooModule,
        BarModule,
        BazModule,
    ],
    routes: [
        {
            path: 'app',
            useComponentClass: AppComponent,
            children: [
                {
                    useModuleClass: AsyncFooModule,
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
