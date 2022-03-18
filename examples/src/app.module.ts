import { Module } from '../../lib';
import { AppView } from './app.view';
import { BarModule } from './modules/bar/bar.module';
import { FooModule } from './modules/foo/foo.module';

@Module({
    imports: [
        FooModule,
        BarModule,
    ],
    views: [
        AppView,
    ],
})
export class AppModule {}
