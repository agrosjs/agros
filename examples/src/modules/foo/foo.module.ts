import { Module } from '../../../../lib';
import { BarModule } from '../bar/bar.module';
import { FooService } from './foo.service';
import { FooView } from './foo.view';

@Module({
    imports: [
        BarModule,
    ],
    providers: [
        FooService,
    ],
    views: [
        FooView,
    ],
})
export class FooModule {}
