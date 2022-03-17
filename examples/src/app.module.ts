import { Module } from '../../lib';
import { FooModule } from './modules/foo/foo.module';

@Module({
    imports: [
        FooModule,
    ],
})
export class AppModule {}
