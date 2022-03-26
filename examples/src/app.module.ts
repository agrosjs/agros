import { Module } from '../../lib';
import { AppNavigateComponent } from './app-navigate.component';
import { AppComponent } from './app.component';
import { BarModule } from './modules/bar/bar.module';
import { BazModule } from './modules/baz/baz.module';
import { FooModule } from './modules/foo/foo.module';

@Module({
    components: [
        AppComponent,
        AppNavigateComponent,
    ],
    imports: [
        FooModule,
        BarModule,
        BazModule,
    ],
    routes: [
        {
            path: 'app',
            useComponentClass: AppComponent,
            children: [
                {
                    useModuleClass: FooModule,
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
