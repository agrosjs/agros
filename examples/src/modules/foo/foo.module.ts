import { Module } from '../../../../lib';
import { FooService } from './foo.service';
import { FooView } from './foo.view';

@Module({
    imports: [
        import('../bar/bar.module'),
    ],
    providers: [
        FooService,
    ],
    views: [
        FooView,
    ],
})
export class FooModule {}
