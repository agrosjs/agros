import { Module } from '../../lib';
import { AppView } from './app.view';
import { BarModule } from './modules/bar/bar.module';
import { BazModule } from './modules/baz/baz.module';
import { FooModule } from './modules/foo/foo.module';

@Module({
    imports: [
        FooModule,
        BarModule,
        BazModule,
    ],
    views: [
        AppView,
    ],
})
export class AppModule {}
